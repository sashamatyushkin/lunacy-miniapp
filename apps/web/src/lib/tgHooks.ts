import { useEffect, useRef } from 'react';
import { tg } from './telegram';

/** Shows Telegram's BackButton while mounted and wires it to `onBack`. */
export function useBackButton(onBack: (() => void) | null) {
  const cb = useRef(onBack);
  cb.current = onBack;

  useEffect(() => {
    const api = tg;
    if (!api || !onBack) return;
    const handler = () => cb.current?.();
    api.BackButton.onClick(handler);
    api.BackButton.show();
    return () => {
      api.BackButton.offClick(handler);
      api.BackButton.hide();
    };
    // Only the presence of a handler should re-run this, not its identity.
  }, [Boolean(onBack)]);
}

type MainButtonOpts = {
  text: string;
  visible?: boolean;
  active?: boolean;
  progress?: boolean;
  onClick: () => void;
};

/** Declarative MainButton. Falls back to nothing outside Telegram. */
export function useMainButton({ text, visible = true, active = true, progress = false, onClick }: MainButtonOpts) {
  const cb = useRef(onClick);
  cb.current = onClick;

  useEffect(() => {
    const api = tg;
    if (!api) return;
    const handler = () => cb.current();
    api.MainButton.onClick(handler);
    return () => {
      api.MainButton.offClick(handler);
      api.MainButton.hide();
    };
  }, []);

  useEffect(() => {
    if (!tg) return;
    tg.MainButton.setParams({
      text,
      color: '#f4f4f4',
      text_color: '#0e0e0e',
      is_active: active,
      is_visible: visible,
    });
    if (progress) tg.MainButton.showProgress(true);
    else tg.MainButton.hideProgress();
  }, [text, visible, active, progress]);
}
