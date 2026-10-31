import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { InfrastructureProject } from '../../types/project';
import { riskColor } from './riskColor';

/**
 * Interactive 3D portfolio globe: a holographic Earth facing India, a light
 * beam per geocoded project (colour = risk, height = physical progress), data
 * arcs from the New Delhi command hub to every site, atmosphere, orbiting
 * satellites and stars. Drag to spin, scroll to zoom, hover a beam for its
 * project, click to select it.
 */

const R = 1;
const DEG = Math.PI / 180;
const HUB = { lat: 28.6139, lon: 77.209 }; // New Delhi
const INDIA_VIEW = { lat: 21, lon: 80 };
const TEXTURE_URL = '/textures/earth-natural.jpg';

/** Lat/lon to a point on the sphere, matching SphereGeometry's UV layout. */
function toVec3(lat: number, lon: number, r = R): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

interface HoverInfo {
  project: InfrastructureProject;
  x: number;
  y: number;
}

interface PortfolioGlobe3DProps {
  projects: InfrastructureProject[];
  selectedProjectId?: string | null;
  onSelectProject?: (project: InfrastructureProject) => void;
  className?: string;
}

const PortfolioGlobe3D: React.FC<PortfolioGlobe3DProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [ready, setReady] = useState(false);
  const selectRef = useRef(onSelectProject);
  selectRef.current = onSelectProject;
  const selectedRef = useRef<string | null | undefined>(selectedProjectId);
  selectedRef.current = selectedProjectId;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sites = projects.filter(
      p => p.hasCoordinates && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    );

    // ---------- Renderer, scene, camera ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const viewDir = toVec3(INDIA_VIEW.lat, INDIA_VIEW.lon).normalize();
    const finalDistance = 3.9;
    camera.position.copy(viewDir.clone().multiplyScalar(reduceMotion ? finalDistance : 9));
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    // No wheel zoom: the globe sits inside a scrolling page and must not trap the wheel.
    controls.enableZoom = false;
    controls.rotateSpeed = 0.55;

    const globe = new THREE.Group();
    scene.add(globe);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };

    // ---------- Earth: holographic shader over the Natural Earth texture ----------
    const earthTexture = track(new THREE.TextureLoader().load(TEXTURE_URL, () => setReady(true)));
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 4;
    const earthMaterial = track(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: earthTexture }, time: { value: 0 } },
        vertexShader: `
          varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform sampler2D map; uniform float time;
          varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
          void main() {
            vec3 c = texture2D(map, vUv).rgb;
            float ocean = smoothstep(0.02, 0.12, c.b - max(c.r, c.g));
            float lum = dot(c, vec3(0.299, 0.587, 0.114));
            vec3 oceanCol = mix(vec3(0.015, 0.04, 0.08), vec3(0.03, 0.09, 0.16), lum);
            vec3 landCol = mix(vec3(0.05, 0.22, 0.27), vec3(0.35, 0.85, 0.9), lum * 0.8);
            vec3 col = mix(landCol, oceanCol, ocean);
            // Soft breathing glow over the subcontinent (centred near 22N 80E).
            float lat = vUv.y * 180.0 - 90.0;
            float lon = vUv.x * 360.0 - 180.0;
            float india = exp(-(pow((lat - 22.0) / 11.0, 2.0) + pow((lon - 80.0) / 11.0, 2.0))) * (1.0 - ocean);
            col += india * vec3(0.04, 0.22, 0.25) * (0.7 + 0.3 * sin(time * 1.6));
            // scan line sweeping across the surface
            float band = smoothstep(0.012, 0.0, abs(fract(vUv.y - time * 0.05) - 0.5));
            col += band * vec3(0.0, 0.35, 0.4) * 0.6;
            float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.0);
            col += fres * vec3(0.13, 0.75, 0.9) * 0.45;
            gl_FragColor = vec4(col, 1.0);
          }`
      })
    );
    const earth = new THREE.Mesh(track(new THREE.SphereGeometry(R, 96, 96)), earthMaterial);
    globe.add(earth);

    // ---------- Graticule ----------
    const gratPositions: number[] = [];
    for (let lat = -75; lat <= 75; lat += 15) {
      for (let lon = -180; lon < 180; lon += 3) {
        const a = toVec3(lat, lon, R * 1.002);
        const b = toVec3(lat, lon + 3, R * 1.002);
        gratPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let lon = -180; lon < 180; lon += 15) {
      for (let lat = -87; lat < 87; lat += 3) {
        const a = toVec3(lat, lon, R * 1.002);
        const b = toVec3(lat + 3, lon, R * 1.002);
        gratPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const gratGeom = track(new THREE.BufferGeometry());
    gratGeom.setAttribute('position', new THREE.Float32BufferAttribute(gratPositions, 3));
    const graticule = new THREE.LineSegments(
      gratGeom,
      track(new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.08 }))
    );
    globe.add(graticule);

    // ---------- Atmosphere glow ----------
    const atmosphere = new THREE.Mesh(
      track(new THREE.SphereGeometry(R * 1.18, 64, 64)),
      track(
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          vertexShader: `
            varying vec3 vNormal; varying vec3 vView;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vView = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: `
            varying vec3 vNormal; varying vec3 vView;
            void main() {
              // Glow strongest just outside the limb, fading into space.
              float rim = 1.0 - abs(dot(vNormal, vView));
              float i = pow(clamp(rim, 0.0, 1.0), 4.0) * smoothstep(1.0, 0.55, rim);
              gl_FragColor = vec4(0.13, 0.7, 0.95, 1.0) * i * 0.9;
            }`
        })
      )
    );
    scene.add(atmosphere);

    // ---------- Stars ----------
    const starPositions = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(18 + Math.random() * 20);
      starPositions.set([v.x, v.y, v.z], i * 3);
    }
    const starGeom = track(new THREE.BufferGeometry());
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeom,
      track(new THREE.PointsMaterial({ color: 0x9fdcff, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.75 }))
    );
    scene.add(stars);

    // ---------- Project beams, base pulses, hub arcs ----------
    const beamMaterialFor = (color: THREE.Color) =>
      track(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { color: { value: color }, time: { value: 0 }, boost: { value: 0 } },
          vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            uniform vec3 color; uniform float time; uniform float boost; varying float vY;
            void main(){
              float a = (1.0 - vY) * 0.85 + 0.15;
              a *= 0.75 + 0.25 * sin(time * 4.0 - vY * 10.0);
              gl_FragColor = vec4(color * (1.2 + boost), a * (0.85 + boost));
            }`
        })
      );
    const ringMaterialFor = (color: THREE.Color, offset: number) =>
      track(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          uniforms: { color: { value: color }, time: { value: 0 }, offset: { value: offset } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            uniform vec3 color; uniform float time; uniform float offset; varying vec2 vUv;
            void main(){
              float d = length(vUv - 0.5) * 2.0;
              float t = fract(time * 0.6 + offset);
              float ring = smoothstep(0.08, 0.0, abs(d - t)) * (1.0 - t);
              float core = smoothstep(0.25, 0.0, d) * 0.6;
              gl_FragColor = vec4(color, (ring + core) * step(d, 1.0));
            }`
        })
      );

    const beamGeom = track(new THREE.CylinderGeometry(0.006, 0.011, 1, 10, 1, true));
    beamGeom.translate(0, 0.5, 0);
    const pickGeom = track(new THREE.CylinderGeometry(0.02, 0.02, 1, 6, 1));
    pickGeom.translate(0, 0.5, 0);
    const headGeom = track(new THREE.SphereGeometry(0.014, 12, 12));
    const ringGeom = track(new THREE.PlaneGeometry(0.12, 0.12));
    const pickMaterial = track(new THREE.MeshBasicMaterial({ visible: false }));
    const up = new THREE.Vector3(0, 1, 0);

    type Site = {
      project: InfrastructureProject;
      group: THREE.Group;
      beamMat: THREE.ShaderMaterial;
      head: THREE.Mesh;
      height: number;
      grow: number;
    };
    const siteObjects: Site[] = [];
    const pickables: THREE.Mesh[] = [];
    const timed: THREE.ShaderMaterial[] = [earthMaterial];

    sites.forEach((p, i) => {
      const color = new THREE.Color(riskColor(p));
      const normal = toVec3(p.latitude as number, p.longitude as number).normalize();
      const group = new THREE.Group();
      group.position.copy(normal.clone().multiplyScalar(R));
      group.quaternion.setFromUnitVectors(up, normal);
      const height = 0.08 + Math.min(100, Math.max(0, p.physicalProgress)) / 100 * 0.34;

      const beamMat = beamMaterialFor(color);
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.scale.y = reduceMotion ? height : 0.0001;
      group.add(beam);

      const head = new THREE.Mesh(headGeom, track(new THREE.MeshBasicMaterial({ color })));
      head.position.y = reduceMotion ? height : 0;
      group.add(head);

      const ringMat = ringMaterialFor(color, (i * 0.137) % 1);
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.002;
      group.add(ring);

      const pick = new THREE.Mesh(pickGeom, pickMaterial);
      pick.scale.y = height + 0.02;
      pick.userData.siteIndex = i;
      group.add(pick);
      pickables.push(pick);

      globe.add(group);
      timed.push(beamMat, ringMat);
      siteObjects.push({ project: p, group, beamMat, head, height, grow: reduceMotion ? 1 : 0 });
    });

    // Arcs from the New Delhi hub to every site, with a light travelling along each.
    const hubPos = toVec3(HUB.lat, HUB.lon, R);
    const arcMaterials: THREE.ShaderMaterial[] = [];
    sites.forEach((p, i) => {
      const end = toVec3(p.latitude as number, p.longitude as number, R);
      const dist = hubPos.distanceTo(end);
      if (dist < 0.01) return;
      const mid = hubPos.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R + dist * 0.45);
      const curve = new THREE.QuadraticBezierCurve3(hubPos, mid, end);
      const geom = track(new THREE.TubeGeometry(curve, 48, 0.0022, 5, false));
      const mat = track(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { time: { value: 0 }, offset: { value: (i * 0.173) % 1 }, color: { value: new THREE.Color(riskColor(p)) } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            uniform float time; uniform float offset; uniform vec3 color; varying vec2 vUv;
            void main(){
              float head = fract(time * 0.35 + offset);
              float d = vUv.x - head;
              float trail = smoothstep(-0.25, 0.0, d) * step(d, 0.0);
              float base = 0.12;
              vec3 c = mix(vec3(0.13, 0.83, 0.93), color, 0.5);
              gl_FragColor = vec4(c, base + trail * 0.9);
            }`
        })
      );
      arcMaterials.push(mat);
      globe.add(new THREE.Mesh(geom, mat));
    });
    timed.push(...arcMaterials);

    // Hub marker
    const hub = new THREE.Mesh(track(new THREE.SphereGeometry(0.018, 16, 16)), track(new THREE.MeshBasicMaterial({ color: 0xffffff })));
    hub.position.copy(hubPos);
    globe.add(hub);
    const hubRingMat = ringMaterialFor(new THREE.Color(0x22d3ee), 0);
    const hubRing = new THREE.Mesh(track(new THREE.PlaneGeometry(0.3, 0.3)), hubRingMat);
    hubRing.position.copy(hubPos.clone().multiplyScalar(1.001));
    hubRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hubPos.clone().normalize());
    globe.add(hubRing);
    timed.push(hubRingMat);

    // ---------- Orbits with satellites ----------
    const orbits: { pivot: THREE.Group; speed: number }[] = [];
    [
      { r: 1.42, tilt: 0.45, speed: 0.22, color: 0x22d3ee },
      { r: 1.6, tilt: -0.9, speed: -0.15, color: 0xa78bfa },
      { r: 1.3, tilt: 1.3, speed: 0.3, color: 0x34d399 }
    ].forEach(o => {
      const pivot = new THREE.Group();
      pivot.rotation.x = o.tilt;
      pivot.rotation.z = o.tilt * 0.5;
      const ringLine = new THREE.Mesh(
        track(new THREE.TorusGeometry(o.r, 0.0012, 6, 160)),
        track(new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.22 }))
      );
      ringLine.rotation.x = Math.PI / 2;
      pivot.add(ringLine);
      const sat = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.022)), track(new THREE.MeshBasicMaterial({ color: o.color })));
      sat.position.set(o.r, 0, 0);
      const glow = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.05, 12, 12)),
        track(new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }))
      );
      sat.add(glow);
      pivot.add(sat);
      scene.add(pivot);
      orbits.push({ pivot, speed: o.speed });
    });

    // ---------- Interaction ----------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = -1;
    let lastInteraction = -Infinity;
    const projectToScreen = (v: THREE.Vector3) => {
      const p = v.clone().project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return { x: (p.x * 0.5 + 0.5) * rect.width, y: (-p.y * 0.5 + 0.5) * rect.height };
    };
    const pick = (clientX: number, clientY: number): number => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([earth, ...pickables], false)[0];
      return hit && hit.object !== earth ? (hit.object.userData.siteIndex as number) : -1;
    };
    const onPointerMove = (e: PointerEvent) => {
      const idx = pick(e.clientX, e.clientY);
      if (idx !== hovered) {
        hovered = idx;
        renderer.domElement.style.cursor = idx >= 0 ? 'pointer' : 'grab';
      }
      if (idx >= 0) {
        const site = siteObjects[idx];
        const top = site.head.getWorldPosition(new THREE.Vector3());
        const s = projectToScreen(top);
        setHover({ project: site.project, x: s.x, y: s.y });
      } else {
        setHover(null);
      }
    };
    const onPointerLeave = () => {
      hovered = -1;
      setHover(null);
    };
    let downAt = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
    };
    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
      const idx = pick(e.clientX, e.clientY);
      if (idx >= 0) selectRef.current?.(siteObjects[idx].project);
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.style.cursor = 'grab';
    controls.addEventListener('start', () => {
      lastInteraction = performance.now();
    });

    // ---------- Sizing, visibility, loop ----------
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    let visible = true;
    const io = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(mount);

    const clock = new THREE.Clock();
    let frame = 0;
    const introStart = performance.now();
    const tmpDir = new THREE.Vector3();
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = reduceMotion ? 0 : clock.elapsedTime;
      const now = performance.now();

      // Intro: fly in from deep space towards India.
      if (!reduceMotion) {
        const k = Math.min(1, (now - introStart) / 2600);
        if (k < 1) {
          const e = 1 - Math.pow(1 - k, 4);
          tmpDir.copy(camera.position).normalize();
          camera.position.copy(tmpDir.multiplyScalar(9 + (finalDistance - 9) * e));
        }
        // Idle sway around India once the user stops dragging.
        if (k >= 1 && now - lastInteraction > 4000) {
          globe.rotation.y += (Math.sin(t * 0.18) * 0.5 - globe.rotation.y) * 0.01;
        }
      }

      for (const m of timed) m.uniforms.time.value = t;
      siteObjects.forEach((s, i) => {
        if (s.grow < 1) s.grow = Math.min(1, s.grow + dt * 0.9 * (now - introStart > 900 + i * 35 ? 1 : 0));
        const g = 1 - Math.pow(1 - s.grow, 3);
        const isHot = i === hovered || s.project.id === selectedRef.current;
        const target = s.height * g * (isHot ? 1.25 : 1);
        const beam = s.group.children[0] as THREE.Mesh;
        beam.scale.y += (Math.max(target, 0.0001) - beam.scale.y) * 0.15;
        beam.scale.x = beam.scale.z = isHot ? 1.8 : 1;
        s.head.position.y = beam.scale.y;
        s.head.scale.setScalar(isHot ? 1.8 : 1);
        s.beamMat.uniforms.boost.value = isHot ? 0.9 : 0;
      });
      orbits.forEach(o => {
        o.pivot.rotation.y += o.speed * dt * (reduceMotion ? 0 : 1);
      });
      stars.rotation.y += dt * 0.004;
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      io.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('click', onClick);
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [projects]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mountRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" />
        </div>
      )}
      {hover && (
        <div
          className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full -mt-3 px-2.5 py-1.5 rounded-lg bg-[#0B0E14]/90 backdrop-blur border border-cyan-500/40 shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)] max-w-[240px]"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="text-[11px] font-bold text-slate-100 leading-snug line-clamp-2">{hover.project.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(hover.project) }} />
            <span className="text-slate-400">{hover.project.state}</span>
            <span className="text-cyan-400 font-bold">{hover.project.physicalProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioGlobe3D;
