import { useEffect, useMemo, useRef } from 'react';

/**
 * 60%-клавиатура, которая собирается из клавиш на скролле. Каждая клавиша —
 * отдельный кейкап (реальная форма, не кусок фото): при p=0 они разлетелись в
 * 3D, при p=1 сложились в раскладку. Скролл двигает одну переменную --p на сцене.
 *
 * Раскраска — под Black Pearl с сайта: деревянный корпус, кремовые кейкапы,
 * тёмно-синие модификаторы, коричневые акценты (клавиши 6 и 7 — тот самый «67»).
 */

// ширины клавиш в юнитах (1u = обычная клавиша)
const ROWS: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
];

// клавиши 6 и 7 в цифровом ряду — акцент 67
const LEGENDS: Record<string, string> = { '0-6': '6', '0-7': '7' };

/** xorshift-хэш — разлёт стабилен между рендерами и перезагрузками. */
function rnd(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Variant = 'cream' | 'dark' | 'accent';
type Key = { id: string; row: number; w: number; legend?: string; variant: Variant; style: React.CSSProperties };

function variantFor(id: string, r: number, i: number, rowLen: number): Variant {
  if (id in LEGENDS) return 'accent'; // 6 и 7
  if (r === ROWS.length - 1) return 'dark'; // нижний ряд модификаторов
  if (r >= 1 && (i === 0 || i === rowLen - 1)) return 'dark'; // крайние (Tab/Caps/Shift/Enter)
  return 'cream';
}

function buildKeys(): Key[] {
  const keys: Key[] = [];
  let n = 0;
  ROWS.forEach((row, r) => {
    row.forEach((w, i) => {
      const id = `${r}-${i}`;
      const seed = n++;
      keys.push({
        id,
        row: r,
        w,
        legend: LEGENDS[id],
        variant: variantFor(id, r, i, row.length),
        style: {
          flexGrow: w,
          flexBasis: 0,
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
          <div className="kb-case">
            <div className="kb-plate">
              {ROWS.map((_row, r) => (
                <div className="kb-row" key={r}>
                  {keys
                    .filter((k) => k.row === r)
                    .map((k) => (
                      <div className={`kb-key kb-key--${k.variant}`} key={k.id} style={k.style}>
                        {k.legend && <span>{k.legend}</span>}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
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
            rotateX(calc(60deg - var(--p) * 46deg))
            rotateZ(calc(-12deg + var(--p) * 12deg))
            scale(calc(0.86 + var(--p) * 0.14));
          transition: transform 60ms linear;
        }
        /* деревянный корпус Black Pearl */
        .kb-case {
          width: min(93vw, 470px);
          padding: 10px;
          border-radius: 8px;
          background: linear-gradient(160deg, #5c4230 0%, #3f2c1c 60%, #33231602 100%), #3f2c1c;
          border: 1px solid #29190f;
          box-shadow: 0 26px 60px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 220, 180, 0.12);
          transform-style: preserve-3d;
          opacity: calc(0.25 + var(--p) * 0.75);
        }
        .kb-plate {
          aspect-ratio: 15 / 5.4;
          padding: 7px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-radius: 4px;
          background: linear-gradient(180deg, #cbc3b1, #b3ab99);
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.35);
          transform-style: preserve-3d;
        }
        .kb-row {
          display: flex;
          gap: 3px;
          flex: 1;
          transform-style: preserve-3d;
        }
        .kb-key {
          --q: clamp(0, calc((1 - var(--p)) * var(--k)), 1);
          border-radius: 3px;
          display: grid;
          place-items: center;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: -0.02em;
          box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.5),
            0 1px 1px rgba(0, 0, 0, 0.25);
          transform:
            translate3d(
              calc(var(--dx) * var(--q) * 1px),
              calc(var(--dy) * var(--q) * 1px),
              calc(var(--dz) * var(--q) * 1px)
            )
            rotateX(calc(var(--rx) * var(--q) * 1deg))
            rotateY(calc(var(--ry) * var(--q) * 1deg))
            rotateZ(calc(var(--rz) * var(--q) * 1deg));
          opacity: calc(0.35 + (1 - var(--q)) * 0.65);
        }
        /* кремовые кейкапы */
        .kb-key--cream {
          background: linear-gradient(180deg, #f5efe3 0%, #e7dfcd 100%);
          color: #4a3a2a;
        }
        /* тёмно-синие модификаторы */
        .kb-key--dark {
          background: linear-gradient(180deg, #3d4553 0%, #2a303b 100%);
          color: #e9e2d2;
          box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 1px 1px rgba(0, 0, 0, 0.3);
        }
        /* коричневые акценты — 6 и 7 */
        .kb-key--accent {
          background: linear-gradient(180deg, #7d5636 0%, #5a3c22 100%);
          color: #f3e8d8;
          font-size: 11px;
          box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 220, 180, 0.25),
            0 1px 1px rgba(0, 0, 0, 0.3);
        }
        @media (prefers-reduced-motion: reduce) {
          .kb-stage { transform: rotateX(18deg); }
          .kb-key { transform: none; opacity: 1; }
          .kb-case { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
