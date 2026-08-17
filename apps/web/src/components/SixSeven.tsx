/**
 * The "67" block: two open palms see-sawing up and down — the gesture from the
 * meme, drawn as a flat silhouette so it reads at 50px as well as at 100px.
 * Left palm carries the 6, right palm the 7; each digit lights up on its own
 * hand's upstroke.
 */

function Palm({ side }: { side: 'l' | 'r' }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-hidden>
      <g
        transform={side === 'r' ? 'scale(-1,1) translate(-100,0)' : undefined}
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        fill="currentColor"
      >
        {/* fingers, fanned open */}
        <line x1="34" y1="58" x2="31" y2="26" />
        <line x1="50" y1="58" x2="50" y2="18" />
        <line x1="66" y1="58" x2="69" y2="22" />
        <line x1="80" y1="60" x2="87" y2="32" />
        {/* thumb */}
        <line x1="28" y1="66" x2="13" y2="52" />
        {/* palm */}
        <rect x="25" y="52" width="63" height="38" rx="15" stroke="none" />
      </g>
    </svg>
  );
}

export function SixSeven({ compact = false, digits = false }: { compact?: boolean; digits?: boolean }) {
  return (
    <div className={`s67${compact ? ' s67--compact' : ''}`}>
      <div className="s67-hand s67-hand--l">
        {digits && <span className="s67-digit">6</span>}
        <span className="s67-palm">
          <Palm side="l" />
        </span>
      </div>
      <div className="s67-hand s67-hand--r">
        {digits && <span className="s67-digit">7</span>}
        <span className="s67-palm">
          <Palm side="r" />
        </span>
      </div>

      <style>{`
        .s67 {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 10px;
          perspective: 600px;
          color: #f4f4f4;
        }
        .s67-hand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          width: 84px;
          transform-style: preserve-3d;
          animation: s67-seesaw 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .s67--compact .s67-hand { width: 46px; gap: 0; }
        .s67-hand--r { animation-delay: -0.75s; }
        .s67-palm { display: block; width: 100%; aspect-ratio: 1; }
        .s67-digit {
          font-size: 26px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.05em;
          animation: s67-blink 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .s67--compact .s67-digit { font-size: 15px; }
        .s67-hand--r .s67-digit { animation-delay: -0.75s; }

        /* Hands rock in opposite phase — "maybe this, maybe that". */
        @keyframes s67-seesaw {
          0%, 100% { transform: translateY(8px) rotate(8deg) rotateY(-10deg); }
          50%      { transform: translateY(-8px) rotate(-8deg) rotateY(10deg); }
        }
        @keyframes s67-blink {
          0%, 100% { opacity: 0.3; transform: scale(0.88); }
          50%      { opacity: 1; transform: scale(1.14); }
        }
        @media (prefers-reduced-motion: reduce) {
          .s67-hand, .s67-digit { animation: none; }
          .s67-digit { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
