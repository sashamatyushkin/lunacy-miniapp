import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrder, markPaid } from '../lib/orders';
import { money } from '../lib/types';
import { Screen, ScreenHeader } from '../components/Screen';
import { Button, ErrorState, Skeleton } from '../components/ui';
import { useBackButton, useMainButton } from '../lib/tgHooks';
import { haptic, isTelegram } from '../lib/telegram';
import { useSession } from '../store/session';
import { track } from '../lib/analytics';

type Phase = 'idle' | 'processing' | 'done';
type Method = 'card' | 'sber' | 'stars';

const METHODS: { id: Method; label: string; glyph: string }[] = [
  { id: 'card', label: 'картой', glyph: '💳' },
  { id: 'sber', label: 'sberpay', glyph: '🟢' },
  { id: 'stars', label: 'stars', glyph: '⭐️' },
];

export default function Payment() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useSession((s) => s.user);
  const [phase, setPhase] = useState<Phase>('idle');
  const [method, setMethod] = useState<Method>('card');

  const query = useQuery({ queryKey: ['order', id], queryFn: () => getOrder(id) });
  const order = query.data;

  useBackButton(phase === 'idle' ? () => navigate('/cart') : null);

  const holder = useMemo(() => {
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return (name || 'lunacy gamer').toUpperCase();
  }, [user]);

  const pay = () => {
    if (phase !== 'idle' || !order) return;
    setPhase('processing');
    haptic.press();
    track('payment_open', { orderId: order.id, method });
    // демо: имитируем проверку платежа, затем успех
    setTimeout(() => {
      markPaid(order.id);
      // сбрасываем кэш, иначе экран заказа покажет старый статус (ожидает оплату)
      void qc.invalidateQueries({ queryKey: ['order', order.id] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      haptic.success();
      setPhase('done');
      track('payment_success', { orderId: order.id, total: order.total });
      setTimeout(() => navigate(`/order/${order.id}`, { replace: true }), 1900);
    }, 2100);
  };

  useMainButton({
    text: order ? (phase === 'idle' ? `оплатить · ${money(order.total)}` : 'оплата…') : 'загрузка',
    visible: phase === 'idle',
    active: phase === 'idle',
    progress: phase === 'processing',
    onClick: pay,
  });

  if (query.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="оплата" />
        <Skeleton className="h-[210px] w-full rounded-2xl" />
      </Screen>
    );
  }
  if (query.isError || !order) {
    return (
      <Screen>
        <ErrorState message="заказ не найден" onRetry={() => navigate('/cart')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="оплата" />

      {/* карта */}
      <div className="pay-card">
        <div className="pay-card-sheen" />
        <div className="flex items-start justify-between">
          <span className="text-[15px] font-semibold lowercase tracking-[0.14em]">lunacy</span>
          <span className="pay-wifi" aria-hidden>
            ))
          </span>
        </div>
        <div className="pay-chip" aria-hidden />
        <div className="pay-number">
          <span>6767</span>
          <span>••••</span>
          <span>••••</span>
          <span>2029</span>
        </div>
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <div className="pay-label">держатель</div>
            <div className="truncate text-[13px] tracking-wide">{holder}</div>
          </div>
          <div className="text-right">
            <div className="pay-label">до</div>
            <div className="text-[13px]">12/29</div>
          </div>
          <div className="pay-brand">67</div>
        </div>
      </div>

      {/* способы оплаты */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              haptic.select();
              setMethod(m.id);
            }}
            className="flex flex-col items-center gap-1 rounded-[6px] border px-2 py-3 text-[12px] transition"
            style={{
              borderColor: method === m.id ? 'var(--color-ink)' : 'var(--color-line)',
              background: method === m.id ? 'var(--color-surface)' : 'transparent',
              color: method === m.id ? 'var(--color-ink)' : 'var(--color-muted)',
            }}
          >
            <span className="text-[18px] leading-none">{m.glyph}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* сумма */}
      <div className="card mt-5 divide-y divide-[var(--color-line)]">
        <div className="flex items-center justify-between px-3.5 py-2.5 text-[13px]">
          <span className="text-[var(--color-muted)]">заказ №{order.number}</span>
          <span className="text-[var(--color-soft)]">{order.items.length} поз.</span>
        </div>
        <div className="flex items-center justify-between px-3.5 py-3">
          <span className="text-[13px] lowercase text-[var(--color-muted)]">к оплате</span>
          <span className="tnum text-[22px] font-bold">{money(order.total)}</span>
        </div>
      </div>

      {!isTelegram && (
        <div className="mt-5">
          <Button loading={phase === 'processing'} onClick={pay}>
            оплатить · {money(order.total)}
          </Button>
        </div>
      )}

      <p className="mt-3 text-center text-[11px] text-[var(--color-muted)]">
        демо-оплата · деньги не списываются
      </p>

      {/* оверлей обработки / успеха */}
      {phase !== 'idle' && (
        <div className="pay-overlay">
          {phase === 'processing' ? (
            <div className="flex flex-col items-center gap-4">
              <span className="pay-spinner" />
              <div className="text-[15px] lowercase text-[var(--color-soft)]">проверяем оплату…</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <span className="pay-particles" aria-hidden>
                {Array.from({ length: 14 }).map((_, i) => (
                  <b key={i} style={{ ['--i' as string]: String(i) }}>
                    {i % 2 ? '7' : '6'}
                  </b>
                ))}
              </span>
              <svg className="pay-check" viewBox="0 0 52 52" width="86" height="86">
                <circle cx="26" cy="26" r="24" fill="none" stroke="#4ea86e" strokeWidth="3" className="pay-check-c" />
                <path fill="none" stroke="#4ea86e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" d="M15 27l7 7 15-16" className="pay-check-p" />
              </svg>
              <div className="text-center">
                <div className="text-[20px] font-semibold lowercase">оплачено</div>
                <div className="mt-1 text-[13px] text-[var(--color-muted)]">{money(order.total)} · заказ №{order.number}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .pay-card {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          padding: 18px;
          height: 210px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #f4f4f4;
          background:
            radial-gradient(120% 140% at 12% 8%, #2c3550 0%, transparent 55%),
            linear-gradient(150deg, #14161c 0%, #24202b 45%, #3a2b22 100%);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 22px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12);
          animation: pay-card-in 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .pay-card-sheen {
          position: absolute; inset: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.14) 48%, transparent 62%);
          transform: translateX(-100%);
          animation: pay-sheen 3.6s ease-in-out 0.6s infinite;
        }
        .pay-wifi { font-size: 15px; opacity: 0.7; transform: rotate(90deg); letter-spacing: -2px; }
        .pay-chip {
          width: 42px; height: 32px; border-radius: 6px;
          background: linear-gradient(135deg, #e6c15a, #b8923a);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15), inset 0 -3px 6px rgba(0,0,0,0.25);
        }
        .pay-chip::after {
          content:''; display:block; margin: 9px auto 0; width: 60%; height: 12px; border-radius: 2px;
          background:
            linear-gradient(90deg, transparent 48%, rgba(0,0,0,0.25) 49%, transparent 51%),
            linear-gradient(0deg, transparent 48%, rgba(0,0,0,0.25) 49%, transparent 51%);
        }
        .pay-number {
          display: flex; gap: 14px; font-size: 18px; letter-spacing: 2px;
          font-weight: 600; text-shadow: 0 1px 1px rgba(0,0,0,0.4);
        }
        .pay-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(255,255,255,0.5); }
        .pay-brand {
          font-size: 22px; font-weight: 800; letter-spacing: -0.04em;
          color: rgba(255,255,255,0.85);
        }
        .pay-overlay {
          position: fixed; inset: 0; z-index: 60;
          display: grid; place-items: center;
          background: rgba(14,14,14,0.86); backdrop-filter: blur(6px);
          animation: pay-fade 0.25s ease;
        }
        .pay-spinner {
          width: 44px; height: 44px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.18); border-top-color: #f4f4f4;
          animation: pay-spin 0.8s linear infinite;
        }
        .pay-check-c { stroke-dasharray: 151; stroke-dashoffset: 151; animation: pay-draw 0.5s ease forwards; }
        .pay-check-p { stroke-dasharray: 48; stroke-dashoffset: 48; animation: pay-draw 0.4s ease 0.35s forwards; }
        .pay-check { animation: pay-pop 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .pay-particles { position: absolute; width: 0; height: 0; }
        .pay-particles b {
          position: absolute; font-weight: 800; font-size: 15px; color: #f4f4f4;
          left: 0; top: 0;
          transform: rotate(calc(var(--i) * 26deg)) translateY(0);
          animation: pay-burst 1.1s cubic-bezier(0.16,1,0.3,1) 0.25s both;
        }
        @keyframes pay-card-in { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes pay-sheen { 0% { transform: translateX(-100%);} 55%,100% { transform: translateX(100%);} }
        @keyframes pay-spin { to { transform: rotate(360deg);} }
        @keyframes pay-fade { from { opacity: 0;} to { opacity: 1;} }
        @keyframes pay-pop { from { transform: scale(0.5); opacity: 0;} to { transform: scale(1); opacity: 1;} }
        @keyframes pay-draw { to { stroke-dashoffset: 0; } }
        @keyframes pay-burst {
          from { opacity: 1; transform: rotate(calc(var(--i) * 26deg)) translateY(-8px) scale(0.6); }
          to { opacity: 0; transform: rotate(calc(var(--i) * 26deg)) translateY(-120px) scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pay-card-sheen, .pay-particles b { animation: none; }
        }
      `}</style>
    </Screen>
  );
}
