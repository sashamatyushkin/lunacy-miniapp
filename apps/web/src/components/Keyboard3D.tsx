import { useEffect, useMemo, useRef } from 'react';

/**
 * Клавиатура Black Pearl с сайта, которая собирается из осколков на скролле.
 *
 * Берём реальное фото keyboard-blackpearl.webp и режем его на сетку плиток
 * (background-position у каждой — её кусочек кадра). При p=0 плитки разлетелись
 * в 3D, при p=1 сложились в цельное фото 1:1 с оригиналом. Скролл двигает одну
 * CSS-переменную --p на сцене — перерисовывается один узел, а не сотня React.
 */

const COLS = 16;
const ROWS = 7;
const IMG = `${import.meta.env.BASE_URL}keyboard-blackpearl.webp`;
const RATIO = 1321 / 611; // пропорции обрезанного фото

/** Детерминированный хэш — разлёт стабилен между рендерами и перезагрузками. */
function rnd(seed: number) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Tile = { key: string; style: React.CSSProperties };

function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = n++;
      tiles.push({
        key: `${r}-${c}`,
        style: {
          // кусочек общего фото
          backgroundImage: `url(${IMG})`,
          backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
          backgroundPosition: `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`,
          // вектор разлёта + индивидуальная скорость сборки
          ['--dx' as string]: ((rnd(seed) - 0.5) * 320).toFixed(1),
          ['--dy' as string]: (-60 - rnd(seed + 11) * 320).toFixed(1),
          ['--dz' as string]: (120 + rnd(seed + 23) * 420).toFixed(1),
          ['--rx' as string]: ((rnd(seed + 31) - 0.5) * 180).toFixed(1),
          ['--ry' as string]: ((rnd(seed + 47) - 0.5) * 180).toFixed(1),
          ['--rz' as string]: ((rnd(seed + 53) - 0.5) * 220).toFixed(1),
          ['--k' as string]: (0.7 + rnd(seed + 71) * 1.2).toFixed(2),
        },
      });
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
      // 0 в начале ленты, 1 после ~300px прокрутки
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
            {tiles.map((t) => (
              <div className="kb-tile" key={t.key} style={t.style} />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        /* Трек выше клавиатуры: она «прилипает» к верху, пока прокручивается
           лишняя высота, поэтому сборка заканчивается на экране. */
        .kb-track {
          height: 360px;
          margin: 0 -16px;
          pointer-events: none;
        }
        .kb-wrap {
          position: sticky;
          top: calc(var(--safe-top) + 18px);
          height: 230px;
          perspective: 1000px;
          perspective-origin: 50% 32%;
        }
        .kb-stage {
          --p: 0;
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          transform-style: preserve-3d;
          transform:
            rotateX(calc(52deg - var(--p) * 44deg))
            rotateZ(calc(-10deg + var(--p) * 10deg))
            scale(calc(0.9 + var(--p) * 0.1));
          transition: transform 60ms linear;
        }
        .kb-plate {
          width: min(94vw, 480px);
          aspect-ratio: ${RATIO};
          display: grid;
          grid-template-columns: repeat(${COLS}, 1fr);
          grid-template-rows: repeat(${ROWS}, 1fr);
          transform-style: preserve-3d;
          filter: drop-shadow(0 24px 44px rgba(0, 0, 0, 0.6));
        }
        .kb-tile {
          --q: clamp(0, calc((1 - var(--p)) * var(--k)), 1);
          background-repeat: no-repeat;
          transform:
            translate3d(
              calc(var(--dx) * var(--q) * 1px),
              calc(var(--dy) * var(--q) * 1px),
              calc(var(--dz) * var(--q) * 1px)
            )
            rotateX(calc(var(--rx) * var(--q) * 1deg))
            rotateY(calc(var(--ry) * var(--q) * 1deg))
            rotateZ(calc(var(--rz) * var(--q) * 1deg));
          opacity: calc(0.5 + (1 - var(--q)) * 0.5);
          /* лёгкое перекрытие, чтобы на сборке не было щелей между плитками */
          outline: 0.5px solid transparent;
          background-clip: padding-box;
        }
        @media (prefers-reduced-motion: reduce) {
          .kb-stage { transform: rotateX(16deg); }
          .kb-tile { transform: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
