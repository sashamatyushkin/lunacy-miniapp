import { create } from 'zustand';
import { get, getToken, post, resolveApiBase, setToken } from '../lib/api';
import { tg } from '../lib/telegram';
import type { User } from '../lib/types';

type State = {
  user: User | null;
  startParam: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  login: () => Promise<void>;
};

// `getState` rather than `get` — the api helper of that name is used below.
export const useSession = create<State>((set, getState) => ({
  user: null,
  startParam: null,
  status: 'idle',
  error: null,

  login: async () => {
    if (getState().status === 'loading') return;
    set({ status: 'loading', error: null });

    // На Pages адрес API приходит из api-endpoint.json — до него сеть недоступна.
    await resolveApiBase();

    // A stored JWT outlives a single launch, so skip the round trip when it
    // is still valid — this also keeps the app usable if initData went stale.
    if (getToken()) {
      try {
        const user = await get<User>('/api/auth/me');
        set({ user, status: 'ready' });
        return;
      } catch {
        setToken(null);
      }
    }

    const initData = tg?.initData;
    if (!initData) {
      const bot = (import.meta.env.VITE_BOT_USERNAME as string | undefined) ?? 'lunacyapp_bot';
      set({
        status: 'error',
        error: `приложение открыто вне telegram. откройте его через бота @${bot}`,
      });
      return;
    }

    try {
      const res = await post<{ token: string; user: User; startParam: string | null }>('/api/auth/telegram', {
        initData,
      });
      setToken(res.token);
      set({ user: res.user, startParam: res.startParam, status: 'ready' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'ошибка авторизации' });
    }
  },
}));
