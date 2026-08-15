import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { haptic, tg } from '../lib/telegram';
import { money, type Order, type OrderStatus } from '../lib/types';
import { Screen, ScreenHeader } from '../components/Screen';
import { Button, ErrorState, Skeleton } from '../components/ui';
import { useBackButton } from '../lib/tgHooks';
import { SixSeven } from '../components/SixSeven';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: 'черновик',
  AWAITING_PAYMENT: 'ждём оплату',
  PAID: 'оплачен',
  SHIPPED: 'в доставке',
  DONE: 'выполнен',
  CANCELLED: 'отменён',
};

export default function OrderScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  useBackButton(() => navigate('/profile'));

  const query = useQuery({
    queryKey: ['order', id],
    queryFn: () => get<Order>(`/api/orders/${id}`),
    // The order flips to PAID from the bot webhook, so poll briefly after checkout.
    refetchInterval: (q) => (q.state.data?.status === 'AWAITING_PAYMENT' ? 3000 : false),
  });

  const pay = useMutation({
    mutationFn: () => post<{ invoiceUrl: string }>(`/api/orders/${id}/pay`),
    onSuccess: ({ invoiceUrl }) => {
      if (tg?.openInvoice) {
        tg.openInvoice(invoiceUrl, (status) => {
          if (status === 'paid') haptic.success();
          void query.refetch();
        });
      } else {
        window.open(invoiceUrl, '_blank', 'noopener');
      }
    },
    onError: () => haptic.error(),
  });

  if (query.isLoading) {
    return (
      <Screen>
        <Skeleton className="h-40 w-full" />
      </Screen>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Screen>
        <ErrorState message="заказ не найден" onRetry={() => navigate('/profile')} />
      </Screen>
    );
  }

  const order = query.data;
  const paid = order.status === 'PAID' || order.status === 'SHIPPED' || order.status === 'DONE';

  return (
    <Screen>
      <ScreenHeader title={`заказ №${order.number}`} />

      <div className="card flex flex-col items-center gap-3 px-5 py-7 text-center">
        {paid ? <SixSeven compact /> : <div className="text-[30px] font-bold tracking-[-0.06em] text-[var(--color-line)]">67</div>}
        <div className="text-[17px] lowercase">{STATUS_LABEL[order.status]}</div>
        <div className="text-[13px] text-[var(--color-muted)]">
          {paid
            ? 'оплата подтверждена сервером. напишем в бота, когда передадим в доставку.'
            : 'ждём подтверждение платежа от telegram — страница обновится сама.'}
        </div>
      </div>

      <div className="card mt-4 divide-y divide-[var(--color-line)]">
        {order.items.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-3.5 py-2.5 text-[13px]">
            <span className="truncate pr-3 text-[var(--color-soft)]">
              {i.title} ×{i.qty}
            </span>
            <span>{money(i.price * i.qty)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3.5 py-3">
          <span className="text-[13px] lowercase text-[var(--color-muted)]">итого</span>
          <span className="text-[17px] font-semibold">{money(order.total)}</span>
        </div>
      </div>

      <div className="card mt-4 px-3.5 py-3 text-[13px] text-[var(--color-soft)]">
        <div>{order.contactName}</div>
        <div className="text-[var(--color-muted)]">{order.phone}</div>
        <div className="text-[var(--color-muted)]">{order.address}</div>
      </div>

      {order.status === 'AWAITING_PAYMENT' && (
        <div className="mt-5">
          <Button loading={pay.isPending} onClick={() => pay.mutate()}>
            оплатить · {money(order.total)}
          </Button>
          {pay.isError && (
            <p className="mt-2 text-center text-[12px] text-[#e08b8b]">{(pay.error as Error).message}</p>
          )}
        </div>
      )}

      <div className="mt-3">
        <Button variant="ghost" onClick={() => navigate('/catalog')}>
          вернуться в каталог
        </Button>
      </div>
    </Screen>
  );
}
