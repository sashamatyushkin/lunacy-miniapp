import { forwardRef, type ReactNode } from 'react';

/** Every screen owns its own scroll container so Telegram's viewport stays fixed. */
export const Screen = forwardRef<HTMLDivElement, { children: ReactNode; flush?: boolean; className?: string }>(
  function Screen({ children, flush = false, className = '' }, ref) {
    return (
      <div
        ref={ref}
        className={`scroll-y no-bar h-full ${flush ? '' : 'px-4'} ${className}`}
        style={{
          paddingTop: 'calc(var(--safe-top) + 10px)',
          paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 28px)',
        }}
      >
        {children}
      </div>
    );
  },
);

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="mb-4 flex items-center justify-between">
      <h1 className="text-[26px]">{title}</h1>
      {right}
    </header>
  );
}
