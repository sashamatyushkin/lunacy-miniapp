import { create } from 'zustand';
import { post, setToken } from '../lib/api';
import { IS_STATIC } from '../lib/data';
import { tg } from '../lib/telegram';
import type { User } from '../lib/types';

/**
 * Сессия. В статической сборке (Pages) авторизация клиентская: берём профиль из
 * Telegram.WebApp.initDataUnsafe и сразу готовы — сервер не нужен, «нет
 * соединения» не показываем. В серверном режиме проверяем initData на бэкенде
 * и получаем JWT (для реальных заказов/оплаты).
 */
type State = {
  user: User | null;
  startParam: string | null;
  status: 'idle' | 'loading' | 'ready';
  login: () => Promise<void>;
};

function refCodeFrom(id: number | string): string {
  return String(id).slice(-8).padStart(8, '0');
}

export const useSession = create<State>((set, getState) => ({
  user: null,
  startParam: null,
  status: 'idle',

  login: async () => {
    if (getState().status !== 'idle') return;
    set({ status: 'loading' });

    const tgUser = tg?.initDataUnsafe?.user;
    const startParam = tg?.initDataUnsafe?.start_param ?? null;

    // Статика или запуск вне Telegram: собираем профиль на клиенте и работаем.
    if (IS_STATIC || !tg?.initData) {
      const user: User | null = tgUser
        ? {
            id: String(tgUser.id),
            tgId: String(tgUser.id),
            username: tgUser.username ?? null,
            firstName: tgUser.first_name ?? 'гость',
            lastName: null,
            photoUrl: tgUser.photo_url ?? null,
            isPremium: false,
            refCode: refCodeFrom(tgUser.id),
            onboardedAt: null,
          }
        : {
            id: 'guest',
            tgId: '0',
            username: null,
            firstName: 'гость',
            lastName: null,
            photoUrl: null,
            isPremium: false,
            refCode: '00000000',
            onboardedAt: null,
          };
      set({ user, startParam, status: 'ready' });
      return;
    }

    // Серверный режим: обмен initData на JWT.
    try {
      const res = await post<{ token: string; user: User; startParam: string | null }>('/api/auth/telegram', {
        initData: tg.initData,
      });
      setToken(res.token);
      set({ user: res.user, startParam: res.startParam, status: 'ready' });
    } catch {
      // Даже если сервер недоступен — не блокируем витрину, показываем как гостя.
      set({
        user: {
          id: 'guest',
          tgId: String(tgUser?.id ?? 0),
          username: tgUser?.username ?? null,
          firstName: tgUser?.first_name ?? 'гость',
          lastName: null,
          photoUrl: tgUser?.photo_url ?? null,
          isPremium: false,
          refCode: refCodeFrom(tgUser?.id ?? 0),
          onboardedAt: null,
        },
        startParam,
        status: 'ready',
      });
    }
  },
}));
