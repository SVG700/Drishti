import * as Cesium from 'cesium';

/**
 * Smooth 60fps Orbit Controller
 * Adapted from God's Eye View (c) Bilawal Sidhu (MIT License)
 * Uses Cesium scene.preRender for smooth, frame-rate independent camera orbiting around a target.
 */
export class OrbitController {
  private viewer: Cesium.Viewer;
  public active: boolean = false;
  public target: Cesium.Cartesian3 | null = null;
  public radius: number = 2500;
  public pitch: number = -30; // degrees
  public speed: number = Cesium.Math.toRadians(6); // 6 deg/sec
  public angle: number = 0;
  private removeListener: (() => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  public start(targetCartesian: Cesium.Cartesian3, options: { radius?: number; pitch?: number; speed?: number } = {}): void {
    if (!targetCartesian) return;

    this.target = targetCartesian;
    this.radius = options.radius || this.radius;
    this.pitch = options.pitch || this.pitch;
    this.speed = Cesium.Math.toRadians(options.speed || 6);
    this.active = true;

    // Calculate current heading from camera to target
    const cameraPos = this.viewer.camera.position;
    const diff = Cesium.Cartesian3.subtract(cameraPos, targetCartesian, new Cesium.Cartesian3());
    this.angle = Math.atan2(diff.y, diff.x);

    if (this.removeListener) {
      this.removeListener();
      this.removeListener = null;
    }

    let lastTime = performance.now();

    const onPreRender = () => {
      if (!this.active || !this.target || this.viewer.isDestroyed()) {
        this.stop();
        return;
      }

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      this.angle += this.speed * dt;

      // Position on sphere orbit
      const heading = this.angle;
      const pitchRad = Cesium.Math.toRadians(this.pitch);

      const offset = new Cesium.HeadingPitchRange(heading, pitchRad, this.radius);
      this.viewer.camera.lookAt(this.target, offset);
    };

    this.removeListener = this.viewer.scene.preRender.addEventListener(onPreRender);
  }

  public stop(): void {
    if (!this.active) return;
    this.active = false;
    if (this.removeListener) {
      this.removeListener();
      this.removeListener = null;
    }
    // Unlock camera transform
    if (!this.viewer.isDestroyed()) {
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
  }

  public toggle(targetCartesian: Cesium.Cartesian3, options?: { radius?: number; pitch?: number; speed?: number }): boolean {
    if (this.active) {
      this.stop();
      return false;
    } else {
      this.start(targetCartesian, options);
      return true;
    }
  }

  public destroy(): void {
    this.stop();
  }
}
