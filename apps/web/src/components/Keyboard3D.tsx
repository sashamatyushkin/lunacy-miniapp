import { useEffect, useMemo, useRef } from 'react';

/**
 * Клавиатура Black Pearl с сайта, которая собирается из осколков на скролле.
 *
 * Берём реальное фото keyboard-blackpearl.webp и режем его на сетку плиток
 * (background-position у каждой — её кусочек кадра). При p=0 плитки разлетелись
 * в 3D, при p=1 сложились в цельное фото 1:1 с оригиналом. Скролл двигает одну
 * CSS-переменную --p на сцене — перерисовывается один узел, а не сотня React.
 */

const COLS = 15;
const ROWS = 6;
const IMG = `${import.meta.env.BASE_URL}keyboard-blackpearl.webp`;
const RATIO = 1321 / 611; // пропорции обрезанного фото

/** Детерминированный хэш — небольшой джиттер стабилен между рендерами. */
function rnd(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Tile = { key: string; style: React.CSSProperties };

/**
 * Клавиши «прилетают» по очереди и встают на свои места, а не разлетаются
 * случайными квадратами. Каждая плитка = один кейкап: у неё свой порядок сборки
 * (--o, волной слева-направо сверху-вниз) и лёгкий вертикальный сброс сверху.
 */
function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  const total = COLS * ROWS;
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = n;
      // порядок сборки: по диагонали слева-сверху — читается как «набор» клавиш
      const order = (r + c) / (ROWS + COLS - 2);
      tiles.push({
        key: `${r}-${c}`,
        style: {
          backgroundImage: `url(${IMG})`,
          backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
          backgroundPosition: `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`,
          ['--o' as string]: order.toFixed(3),
          // небольшой горизонтальный джиттер, чтобы клавиши падали чуть живее
          ['--jx' as string]: ((rnd(seed) - 0.5) * 26).toFixed(1),
          ['--i' as string]: String(n),
          zIndex: total - n,
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
          /* локальный прогресс клавиши: стартует со сдвигом --o (волна) и
             доезжает до 1 (встала на место). Ширина окна 0.5 → соседние
             клавиши садятся друг за другом, как при наборе. */
          --a: clamp(0, calc((var(--p) - var(--o) * 0.5) / 0.5), 1);
          --drop: calc((1 - var(--a)));
          background-repeat: no-repeat;
          transform:
            translate3d(
              calc(var(--jx) * var(--drop) * 1px),
              calc(var(--drop) * -190px),
              calc(var(--drop) * 260px)
            )
            rotateX(calc(var(--drop) * 70deg));
          transform-origin: 50% 120%;
          opacity: calc(0.15 + var(--a) * 0.85);
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
