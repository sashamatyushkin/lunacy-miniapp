/**
 * Thin, typed wrapper over window.Telegram.WebApp.
 * Every call degrades to a no-op in a normal browser so the app is still
 * developable outside Telegram.
 */

type Impact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type Notify = 'error' | 'success' | 'warning';

type Insets = { top: number; bottom: number; left: number; right: number };

export type WebApp = {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name: string; username?: string; photo_url?: string }; start_param?: string };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  viewportStableHeight: number;
  isExpanded: boolean;
  isFullscreen?: boolean;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
  ready(): void;
  expand(): void;
  close(): void;
  requestFullscreen?(): void;
  exitFullscreen?(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  setBottomBarColor?(c: string): void;
  openTelegramLink(url: string): void;
  openInvoice(url: string, cb?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void): void;
  onEvent(e: string, cb: (...a: unknown[]) => void): void;
  offEvent(e: string, cb: (...a: unknown[]) => void): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  MainButton: {
    setParams(p: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): void;
    show(): void;
    hide(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(s: Impact): void;
    notificationOccurred(t: Notify): void;
    selectionChanged(): void;
  };
};

export const tg: WebApp | undefined =
  typeof window !== 'undefined' ? (window as unknown as { Telegram?: { WebApp: WebApp } }).Telegram?.WebApp : undefined;

export const isTelegram = Boolean(tg?.initData);

export const haptic = {
  tap: () => tg?.HapticFeedback?.impactOccurred('light'),
  press: () => tg?.HapticFeedback?.impactOccurred('medium'),
  select: () => tg?.HapticFeedback?.selectionChanged(),
  success: () => tg?.HapticFeedback?.notificationOccurred('success'),
  error: () => tg?.HapticFeedback?.notificationOccurred('error'),
};

/** Mirrors Telegram's safe-area insets into CSS vars and keeps them in sync. */
export function syncSafeArea() {
  const apply = () => {
    const root = document.documentElement;
    const top = Math.max(tg?.safeAreaInset?.top ?? 0, tg?.contentSafeAreaInset?.top ?? 0);
    const bottom = Math.max(tg?.safeAreaInset?.bottom ?? 0, tg?.contentSafeAreaInset?.bottom ?? 0);
    root.style.setProperty('--safe-top', `${top || (tg?.isFullscreen ? 48 : 8)}px`);
    root.style.setProperty('--safe-bottom', `${Math.max(bottom, 8)}px`);
  };
  apply();
  if (!tg) return () => {};
  const events = ['safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'viewportChanged'];
  events.forEach((e) => tg.onEvent(e, apply));
  return () => events.forEach((e) => tg.offEvent(e, apply));
}
