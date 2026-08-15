import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrder } from '../lib/orders';
import { money, type OrderStatus } from '../lib/types';
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

  const query = useQuery({ queryKey: ['order', id], queryFn: () => getOrder(id) });

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
  const done = order.status === 'PAID' || order.status === 'SHIPPED' || order.status === 'DONE';

  return (
    <Screen>
      <ScreenHeader title={`заказ №${order.number}`} />

      <div className="card flex flex-col items-center gap-3 px-5 py-7 text-center">
        <SixSeven compact />
        <div className="text-[17px] lowercase">заказ принят</div>
        <div className="text-[13px] text-[var(--color-muted)]">
          {done
            ? 'заказ выполнен.'
            : 'мы получили ваш заказ и свяжемся с вами в telegram, чтобы подтвердить и рассчитать доставку.'}
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

      <div className="mt-5">
        <Button variant="ghost" onClick={() => navigate('/catalog')}>
          вернуться в каталог
        </Button>
      </div>
    </Screen>
  );
}
