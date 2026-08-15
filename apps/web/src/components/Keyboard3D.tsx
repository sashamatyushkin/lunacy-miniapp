import { useEffect, useMemo, useRef } from 'react';

/**
 * A 60% keyboard that assembles itself as the feed scrolls down.
 *
 * Every keycap gets a deterministic scatter vector. A single CSS custom
 * property (--p, 0 → 1) on the stage drives all of them, so scrolling touches
 * one DOM node instead of re-rendering ~62 React elements per frame.
 */

const ROWS: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
];

const LEGENDS: Record<string, string> = { '0-6': '6', '0-7': '7' };

/** xorshift-ish hash so the scatter is stable between renders and reloads. */
function rnd(seed: number) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  x -= Math.floor(x);
  return x;
}

type Key = {
  id: string;
  row: number;
  w: number;
  legend?: string;
  hero: boolean;
  style: React.CSSProperties;
};

function buildKeys(): Key[] {
  const keys: Key[] = [];
  let n = 0;
  ROWS.forEach((row, r) => {
    row.forEach((w, i) => {
      const id = `${r}-${i}`;
      const seed = n++;
      const hero = id in LEGENDS;
      keys.push({
        id,
        row: r,
        w,
        legend: LEGENDS[id],
        hero,
        style: {
          flexGrow: w,
          flexBasis: 0,
          // scatter vector + per-key assembly speed
          ['--dx' as string]: ((rnd(seed) - 0.5) * 260).toFixed(1),
          ['--dy' as string]: (-40 - rnd(seed + 11) * 300).toFixed(1),
          ['--dz' as string]: (60 + rnd(seed + 23) * 320).toFixed(1),
          ['--rx' as string]: ((rnd(seed + 31) - 0.5) * 140).toFixed(1),
          ['--ry' as string]: ((rnd(seed + 47) - 0.5) * 140).toFixed(1),
          ['--rz' as string]: ((rnd(seed + 53) - 0.5) * 180).toFixed(1),
          ['--k' as string]: (0.7 + rnd(seed + 71) * 1.1).toFixed(2),
        },
      });
    });
  });
  return keys;
}

export function Keyboard3D({ scrollRef }: { scrollRef: React.RefObject<HTMLElement | null> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const keys = useMemo(buildKeys, []);

  useEffect(() => {
    const el = scrollRef.current;
    const stage = stageRef.current;
    if (!el || !stage) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      // 0 at the top of the feed, 1 once the user has scrolled ~320px down
      const p = Math.min(1, Math.max(0, el.scrollTop / 300));
      stage.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollRef]);

  return (
    <div className="kb-track" aria-hidden>
      <div className="kb-wrap">
        <div className="kb-stage" ref={stageRef}>
        <div className="kb-plate">
          {ROWS.map((_row, r) => (
            <div className="kb-row" key={r}>
              {keys
                .filter((k) => k.row === r)
                .map((k) => (
                  <div className={`kb-key${k.hero ? ' kb-key--hero' : ''}`} key={k.id} style={k.style}>
                    {k.legend && <span>{k.legend}</span>}
                  </div>
                ))}
            </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        /* The track is taller than the keyboard: the keyboard sticks to the top
           of the viewport while the extra height is scrolled through, so the
           assembly finishes on screen instead of above it. */
        .kb-track {
          height: 360px;
          margin: 0 -16px;
          pointer-events: none;
        }
        .kb-wrap {
          position: sticky;
          top: calc(var(--safe-top) + 18px);
          height: 230px;
          perspective: 900px;
          perspective-origin: 50% 30%;
        }
        .kb-stage {
          --p: 0;
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          transform-style: preserve-3d;
          transform:
            rotateX(calc(62deg - var(--p) * 44deg))
            rotateZ(calc(-14deg + var(--p) * 14deg))
            scale(calc(0.86 + var(--p) * 0.14));
          transition: transform 60ms linear;
        }
        .kb-plate {
          width: min(92vw, 460px);
          aspect-ratio: 15 / 5.6;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          transform-style: preserve-3d;
          border-radius: 4px;
          background: linear-gradient(180deg, #202020, #131313);
          border: 1px solid #363636;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75);
          opacity: calc(0.45 + var(--p) * 0.55);
        }
        .kb-row {
          display: flex;
          gap: 3px;
          flex: 1;
          transform-style: preserve-3d;
        }
        .kb-key {
          --q: clamp(0, calc((1 - var(--p)) * var(--k)), 1);
          border-radius: 2px;
          background: linear-gradient(180deg, #3a3a3a, #262626);
          border: 1px solid #454545;
          box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          font-size: 9px;
          font-weight: 700;
          color: #b6b6b6;
          transform:
            translate3d(
              calc(var(--dx) * var(--q) * 1px),
              calc(var(--dy) * var(--q) * 1px),
              calc(var(--dz) * var(--q) * 1px)
            )
            rotateX(calc(var(--rx) * var(--q) * 1deg))
            rotateY(calc(var(--ry) * var(--q) * 1deg))
            rotateZ(calc(var(--rz) * var(--q) * 1deg));
          opacity: calc(0.55 + (1 - var(--q)) * 0.45);
        }
        /* Contrast the assembled board a little more as it comes together. */
        .kb-key--hero {
          background: linear-gradient(180deg, #ffffff, #d9d9d9);
          border-color: #ffffff;
          color: #0e0e0e;
          font-size: 11px;
        }
        @media (prefers-reduced-motion: reduce) {
          .kb-stage { transform: rotateX(20deg); }
          .kb-key { transform: none; opacity: 1; }
          .kb-plate { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
