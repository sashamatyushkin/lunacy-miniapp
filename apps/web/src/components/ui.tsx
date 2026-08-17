import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { haptic } from '../lib/telegram';

type Variant = 'primary' | 'ghost' | 'quiet';

export function Button({
  variant = 'primary',
  loading,
  className = '',
  onClick,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const base =
    'btn-ripple relative overflow-hidden inline-flex h-12 w-full items-center justify-center gap-2 rounded-[3px] text-[15px] font-medium lowercase transition active:scale-[0.985] disabled:opacity-40 disabled:active:scale-100';
  const styles: Record<Variant, string> = {
    primary: 'bg-[var(--color-ink)] text-[var(--color-bg)]',
    ghost: 'border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)]',
    quiet: 'text-[var(--color-muted)]',
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      onPointerDown={spawnRipple}
      onClick={(e) => {
        haptic.press();
        onClick?.(e);
      }}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

/** Лёгкий ripple из точки нажатия — тактильно приятная кнопка. */
function spawnRipple(e: React.PointerEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const d = Math.max(rect.width, rect.height);
  const r = document.createElement('span');
  r.className = 'btn-ripple-dot';
  r.style.width = r.style.height = `${d}px`;
  r.style.left = `${e.clientX - rect.left - d / 2}px`;
  r.style.top = `${e.clientY - rect.top - d / 2}px`;
  btn.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

export function Field({
  label,
  error,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] lowercase text-[var(--color-muted)]">{label}</span>
      <input
        {...rest}
        className={`h-12 w-full rounded-[3px] border bg-[var(--color-surface)] px-3.5 text-[15px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-soft)] ${
          error ? 'border-[#c25b5b]' : 'border-[var(--color-line)]'
        }`}
      />
      {error && <span className="mt-1 block text-[11px] text-[#c25b5b]">{error}</span>}
    </label>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`sk ${className}`} />;
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[196px]" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-3 text-[34px] font-bold tracking-[-0.06em] text-[var(--color-line)]">67</div>
      <div className="text-[16px] lowercase text-[var(--color-ink)]">{title}</div>
      {hint && <div className="mt-1.5 text-[13px] text-[var(--color-muted)]">{hint}</div>}
      {action && <div className="mt-5 w-full max-w-[240px]">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-3 text-[34px] font-bold tracking-[-0.06em] text-[#c25b5b]">!</div>
      <div className="text-[15px] lowercase text-[var(--color-ink)]">{message}</div>
      {onRetry && (
        <div className="mt-5 w-full max-w-[240px]">
          <Button variant="ghost" onClick={onRetry}>
            повторить
          </Button>
        </div>
      )}
    </div>
  );
}
