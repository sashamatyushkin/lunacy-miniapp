import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listOrders } from '../lib/orders';
import { money } from '../lib/types';
import { useSession } from '../store/session';
import { Screen, ScreenHeader } from '../components/Screen';
import { Button, EmptyState, Section, Skeleton } from '../components/ui';
import { STATUS_LABEL } from './OrderScreen';
import { haptic, tg } from '../lib/telegram';
import { track } from '../lib/analytics';

const BOT = (import.meta.env.VITE_BOT_USERNAME as string | undefined) ?? 'lunacy_shop_bot';
const APP = (import.meta.env.VITE_APP_SHORTNAME as string | undefined) ?? 'shop';

export default function Profile() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    track('screen_view', { screen: 'profile' });
  }, []);

  const me = useSession((s) => s.user);
  const orders = useQuery({ queryKey: ['orders'], queryFn: listOrders });

  const refLink = me ? `https://t.me/${BOT}/${APP}?startapp=ref_${me.refCode}` : '';

  const share = () => {
    if (!refLink) return;
    haptic.press();
    track('referral_share', {});
    const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(
      'lunacy — игровые девайсы прямо в telegram',
    )}`;
    if (tg) tg.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener');
  };

  const copy = async () => {
    if (!refLink) return;
    await navigator.clipboard.writeText(refLink).catch(() => {});
    setCopied(true);
    haptic.success();
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Screen>
      <ScreenHeader title="профиль" />

      <div className="card flex items-center gap-3.5 p-3.5">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-surface)] text-[18px] font-semibold">
          {me?.photoUrl ? (
            <img src={me.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (me?.firstName?.[0] ?? '·').toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[16px]">
            {me?.firstName} {me?.lastName ?? ''}
          </div>
          <div className="text-[12px] text-[var(--color-muted)]">
            {me?.username ? `@${me.username}` : me?.tgId && me.tgId !== '0' ? `id ${me.tgId}` : 'гость'}
          </div>
        </div>
      </div>

      <Section title="приглашай друзей">
        <div className="card p-3.5">
          <p className="text-[13px] text-[var(--color-muted)]">
            делитесь магазином с друзьями — отправьте им ссылку на приложение.
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={share}>поделиться</Button>
            <Button variant="ghost" onClick={copy}>
              {copied ? 'скопировано' : 'копировать'}
            </Button>
          </div>
        </div>
      </Section>

      <Section title="мои заказы">
        {orders.isLoading ? (
          <>{[0, 1].map((i) => <Skeleton key={i} className="mb-2.5 h-[72px]" />)}</>
        ) : orders.data?.length === 0 ? (
          <EmptyState
            title="заказов пока нет"
            action={
              <Link to="/catalog">
                <Button variant="ghost">в каталог</Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {orders.data?.map((o) => (
              <Link key={o.id} to={`/order/${o.id}`} className="card flex items-center justify-between p-3.5">
                <div>
                  <div className="text-[14px]">заказ №{o.number}</div>
                  <div className="text-[12px] lowercase text-[var(--color-muted)]">
                    {STATUS_LABEL[o.status]} · {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="text-[14px] font-semibold">{money(o.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="поддержка">
        <div className="card divide-y divide-[var(--color-line)] text-[13px]">
          <a className="block px-3.5 py-3" href="mailto:help@lunacy.ru">
            help@lunacy.ru
          </a>
          <a className="block px-3.5 py-3" href="https://www.lunacy.ru" target="_blank" rel="noreferrer">
            lunacy.ru
          </a>
        </div>
      </Section>
    </Screen>
  );
}
