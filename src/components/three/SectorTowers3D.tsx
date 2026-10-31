import React, { useEffect, useState } from 'react';

export interface SectorTower {
  name: string;
  cost: number;
  count: number;
}

interface SectorTowers3DProps {
  sectors: SectorTower[];
}

const TOWER_COLORS = [
  ['#22d3ee', '#0e7490'],
  ['#818cf8', '#4338ca'],
  ['#c084fc', '#7e22ce'],
  ['#34d399', '#047857'],
  ['#fbbf24', '#b45309']
];

const MAX_HEIGHT = 150;
const TOWER = 46;
const GAP = 26;

/**
 * Isometric 3D towers (pure CSS 3D), one per sector, height proportional to
 * capital. Towers rise on mount; the stage turns with the cursor; hovering a
 * tower or its legend chip highlights both.
 */
export const SectorTowers3D: React.FC<SectorTowers3DProps> = ({ sectors }) => {
  const [grown, setGrown] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const maxCost = Math.max(...sectors.map(s => s.cost), 1);

  useEffect(() => {
    const timer = setTimeout(() => setGrown(true), 250);
    return () => clearTimeout(timer);
  }, []);

  const floorWidth = sectors.length * (TOWER + GAP) + GAP;

  return (
    <div className="space-y-2">
      <div
        className="relative h-[220px] flex items-center justify-center overflow-hidden"
        style={{ perspective: '1100px' }}
        onPointerMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTilt({
            x: (e.clientX - rect.left) / rect.width - 0.5,
            y: (e.clientY - rect.top) / rect.height - 0.5
          });
        }}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div
          className="relative"
          style={{
            width: floorWidth,
            height: TOWER + GAP * 2,
            transformStyle: 'preserve-3d',
            transform: `translateY(48px) rotateX(${60 - tilt.y * 10}deg) rotateZ(${-32 + tilt.x * 22}deg)`,
            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Floor with grid and glow */}
          <div
            className="absolute inset-0 rounded-md"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(34,211,238,0.18), transparent 70%), linear-gradient(rgba(34,211,238,0.12) 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(90deg, rgba(34,211,238,0.12) 1px, transparent 1px) 0 0 / 18px 18px',
              boxShadow: '0 0 40px rgba(34,211,238,0.15) inset'
            }}
          />
          {sectors.map((s, i) => {
            const [light, dark] = TOWER_COLORS[i % TOWER_COLORS.length];
            const h = grown ? Math.max(8, (s.cost / maxCost) * MAX_HEIGHT) : 1;
            const isActive = active === i;
            const lift = isActive ? 14 : 0;
            const faceBase: React.CSSProperties = {
              position: 'absolute',
              transformOrigin: '0 0',
              transition: 'all 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: `${i * 0.08}s`
            };
            return (
              <div
                key={s.name}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                className="absolute cursor-pointer"
                style={{
                  left: GAP + i * (TOWER + GAP),
                  top: GAP,
                  width: TOWER,
                  height: TOWER,
                  transformStyle: 'preserve-3d',
                  transform: `translateZ(${lift}px)`,
                  transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* ground glow */}
                <div
                  className="absolute -inset-3 rounded-full"
                  style={{ background: `radial-gradient(circle, ${light}${isActive ? '88' : '44'}, transparent 70%)`, transition: 'background 0.3s' }}
                />
                {/* back (y = 0) */}
                <div style={{ ...faceBase, width: TOWER, height: h, transform: 'rotateX(90deg)', background: dark }} />
                {/* left (x = 0) */}
                <div style={{ ...faceBase, width: h, height: TOWER, transform: 'rotateY(-90deg)', background: dark }} />
                {/* front (y = TOWER) */}
                <div
                  style={{
                    ...faceBase,
                    width: TOWER,
                    height: h,
                    transform: `translateY(${TOWER}px) rotateX(90deg)`,
                    background: `linear-gradient(to bottom, ${dark}, ${light})`,
                    boxShadow: isActive ? `0 0 24px ${light}` : 'none'
                  }}
                />
                {/* right (x = TOWER) */}
                <div
                  style={{
                    ...faceBase,
                    width: h,
                    height: TOWER,
                    transform: `translateX(${TOWER}px) rotateY(-90deg)`,
                    background: `linear-gradient(to right, ${dark}, ${light}cc)`
                  }}
                />
                {/* top */}
                <div
                  style={{
                    ...faceBase,
                    width: TOWER,
                    height: TOWER,
                    transform: `translateZ(${h}px)`,
                    background: light,
                    boxShadow: `0 0 ${isActive ? 34 : 18}px ${light}`,
                    opacity: 0.95
                  }}
                >
                  <div className="absolute inset-1 border border-white/50 rounded-[2px]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend chips, linked to the towers */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {sectors.map((s, i) => {
          const [light] = TOWER_COLORS[i % TOWER_COLORS.length];
          return (
            <div
              key={s.name}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              className={`px-2 py-1 rounded-md border text-[10px] font-mono cursor-default transition-all duration-200 ${
                active === i ? 'bg-slate-800/80 border-slate-600 -translate-y-0.5' : 'bg-[#10141D] border-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: light, boxShadow: `0 0 8px ${light}` }} />
                <span className="text-slate-200 font-semibold truncate max-w-[110px]">{s.name}</span>
              </div>
              <div className="text-slate-400 mt-0.5">
                ₹{Math.round(s.cost).toLocaleString('en-IN')} Cr • {s.count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
