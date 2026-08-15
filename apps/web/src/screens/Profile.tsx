import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { money, type Order, type User } from '../lib/types';
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

  const me = useQuery({ queryKey: ['me'], queryFn: () => get<User>('/api/auth/me') });
  const orders = useQuery({ queryKey: ['orders'], queryFn: () => get<Order[]>('/api/orders') });

  const refLink = me.data ? `https://t.me/${BOT}/${APP}?startapp=ref_${me.data.refCode}` : '';

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
          {me.data?.photoUrl ? (
            <img src={me.data.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (me.data?.firstName?.[0] ?? '·').toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          {me.isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <div className="truncate text-[16px]">
                {me.data?.firstName} {me.data?.lastName ?? ''}
              </div>
              <div className="text-[12px] text-[var(--color-muted)]">
                {me.data?.username ? `@${me.data.username}` : `id ${me.data?.tgId ?? ''}`}
              </div>
            </>
          )}
        </div>
      </div>

      <Section title="приглашай друзей">
        <div className="card p-3.5">
          <p className="text-[13px] text-[var(--color-muted)]">
            каждый, кто откроет магазин по вашей ссылке, закрепляется за вами. приглашено:{' '}
            <span className="text-[var(--color-ink)]">{me.data?._count?.referrals ?? 0}</span>
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
          [0, 1].map((i) => <Skeleton key={i} className="mb-2.5 h-[72px]" />)
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
