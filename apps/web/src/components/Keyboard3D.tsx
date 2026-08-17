import { useEffect, useMemo, useRef } from 'react';

/**
 * Black Pearl, которая собирается на скролле — по принципу «scroll-scrubbed
 * assembly», как на продуктовых страницах Apple (кадры привязаны к прокрутке).
 *
 * Кадры мы не пекём (нет 3D-модели), но повторяем то, что делает такую сборку
 * дорогой на вид:
 *   • клавиши садятся на ВИДИМУЮ доску (базовый слой — затемнённое фото), а не
 *     возникают в пустоте;
 *   • порядок сборки — из центра наружу, с лёгкой органикой, а не сеткой;
 *   • пружинное замедление (smoothstep) — клавиши плавно «доезжают»;
 *   • motion-blur на летящих клавишах затухает при посадке;
 *   • контактная тень усиливается к финалу.
 * В собранном виде плитки бесшовны — это ровно фото с сайта, 1:1.
 *
 * Скролл двигает одну переменную --p на сцене → перерисовывается один узел.
 */

const COLS = 15;
const ROWS = 6;
const IMG = `${import.meta.env.BASE_URL}keyboard-blackpearl.webp`;
const RATIO = 1321 / 611;

function rnd(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Tile = { key: string; style: React.CSSProperties };

function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  const cx = (COLS - 1) / 2;
  const cy = (ROWS - 1) / 2;
  const maxDist = Math.hypot(cx, cy);
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = n;
      // порядок сборки: из центра наружу + немного органики
      const radial = Math.hypot(c - cx, r - cy) / maxDist;
      const order = Math.min(1, radial * 0.82 + rnd(seed + 5) * 0.18);
      tiles.push({
        key: `${r}-${c}`,
        style: {
          backgroundImage: `url(${IMG})`,
          backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
          backgroundPosition: `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`,
          ['--o' as string]: order.toFixed(3),
          ['--jx' as string]: ((rnd(seed) - 0.5) * 40).toFixed(1),
          ['--rot' as string]: ((rnd(seed + 9) - 0.5) * 26).toFixed(1),
        },
      });
      n++;
    }
  }
  return tiles;
}

export function Keyboard3D({ scrollRef }: { scrollRef: React.RefObject<HTMLElement | null> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiles = useMemo(buildTiles, []);

  useEffect(() => {
    const el = scrollRef.current;
    const stage = stageRef.current;
    if (!el || !stage) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, el.scrollTop / 320));
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
            {/* доска, на которую садятся клавиши */}
            <div className="kb-base" style={{ backgroundImage: `url(${IMG})` }} />
            {tiles.map((t) => (
              <div className="kb-tile" key={t.key} style={t.style} />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .kb-track {
          height: 380px;
          margin: 0 -16px;
          pointer-events: none;
        }
        .kb-wrap {
          position: sticky;
          top: calc(var(--safe-top) + 18px);
          height: 240px;
          perspective: 1100px;
          perspective-origin: 50% 34%;
        }
        .kb-stage {
          --p: 0;
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          transform-style: preserve-3d;
          transform:
            rotateX(calc(48deg - var(--p) * 40deg))
            rotateZ(calc(-8deg + var(--p) * 8deg))
            scale(calc(0.92 + var(--p) * 0.08));
          transition: transform 90ms linear;
        }
        .kb-plate {
          position: relative;
          width: min(94vw, 480px);
          aspect-ratio: ${RATIO};
          display: grid;
          grid-template-columns: repeat(${COLS}, 1fr);
          grid-template-rows: repeat(${ROWS}, 1fr);
          transform-style: preserve-3d;
          /* контактная тень крепнет по мере сборки */
          filter: drop-shadow(
            0 calc(8px + var(--p) * 22px) calc(18px + var(--p) * 30px)
            rgba(0, 0, 0, calc(0.28 + var(--p) * 0.34))
          );
        }
        .kb-base {
          position: absolute;
          inset: 0;
          grid-area: 1 / 1 / -1 / -1;
          background-size: cover;
          background-position: center;
          border-radius: 6px;
          filter: brightness(0.32) saturate(0.6) blur(1px);
          opacity: calc(0.35 + var(--p) * 0.4);
        }
        .kb-tile {
          /* локальный прогресс клавиши: центр стартует раньше краёв (--o) */
          --a: clamp(0, calc((var(--p) - var(--o) * 0.5) / 0.5), 1);
          /* smoothstep — мягкое пружинное замедление на посадке */
          --s: calc(var(--a) * var(--a) * (3 - 2 * var(--a)));
          --d: calc(1 - var(--s));
          position: relative;
          background-repeat: no-repeat;
          background-clip: padding-box;
          transform:
            translate3d(
              calc(var(--jx) * var(--d) * 1px),
              calc(var(--d) * -150px),
              calc(var(--d) * 175px)
            )
            rotateX(calc(var(--d) * 52deg))
            rotateZ(calc(var(--rot) * var(--d) * 1deg))
            scale(calc(1 + var(--d) * 0.05));
          transform-origin: 50% 65%;
          /* motion-blur, гаснет при посадке; лёгкий подсвет к финалу */
          filter: blur(calc(var(--d) * 3.4px)) brightness(calc(0.62 + var(--s) * 0.38));
          opacity: calc(0.08 + var(--s) * 0.92);
          will-change: transform, filter, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .kb-stage { transform: rotateX(14deg); }
          .kb-tile { transform: none; opacity: 1; filter: none; }
          .kb-base { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
