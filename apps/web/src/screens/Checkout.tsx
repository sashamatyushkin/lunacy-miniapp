import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, post } from '../lib/api';
import { money, type Order } from '../lib/types';
import { Screen, ScreenHeader } from '../components/Screen';
import { Button, Field } from '../components/ui';
import { useBackButton, useMainButton } from '../lib/tgHooks';
import { haptic, isTelegram, tg } from '../lib/telegram';
import { useCart } from '../store/cart';
import { track } from '../lib/analytics';

type Form = { contactName: string; phone: string; address: string; comment: string };
type Errors = Partial<Record<keyof Form, string>>;

const STORAGE_KEY = 'lunacy_checkout';

function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.contactName.trim().length < 2) e.contactName = 'укажите имя';
  if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'укажите телефон';
  if (f.address.trim().length < 5) e.address = 'укажите адрес доставки';
  return e;
}

export default function Checkout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cart } = useCart();
  const [form, setForm] = useState<Form>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Form) : { contactName: '', phone: '', address: '', comment: '' };
  });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useBackButton(() => navigate(-1));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    if (cart && cart.items.length === 0) navigate('/cart', { replace: true });
  }, [cart, navigate]);

  const checkout = useMutation({
    mutationFn: () =>
      post<{ order: Order; invoiceUrl: string }>('/api/orders/checkout', {
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        comment: form.comment.trim() || undefined,
      }),
    onSuccess: ({ order, invoiceUrl }) => {
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      track('payment_open', { orderId: order.id });

      if (tg?.openInvoice) {
        tg.openInvoice(invoiceUrl, (status) => {
          if (status === 'paid') {
            haptic.success();
            navigate(`/order/${order.id}`, { replace: true });
          } else if (status === 'failed') {
            haptic.error();
            setServerError('оплата не прошла. заказ сохранён — можно оплатить из профиля');
          } else {
            navigate(`/order/${order.id}`, { replace: true });
          }
        });
      } else {
        window.open(invoiceUrl, '_blank', 'noopener');
        navigate(`/order/${order.id}`, { replace: true });
      }
    },
    onError: (e) => {
      haptic.error();
      void qc.invalidateQueries({ queryKey: ['cart'] });
      // The order was created but the invoice failed — send the user to it so
      // they can retry payment instead of re-entering the whole form.
      const orderId = e instanceof ApiError ? (e.data?.orderId as string | undefined) : undefined;
      if (orderId) {
        navigate(`/order/${orderId}`, { replace: true });
        return;
      }
      setServerError(e instanceof Error ? e.message : 'не удалось оформить заказ');
    },
  });

  const submit = () => {
    const e = validate(form);
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length > 0) {
      haptic.error();
      return;
    }
    checkout.mutate();
  };

  useMainButton({
    text: cart ? `оплатить · ${money(cart.total)}` : 'оплатить',
    active: !checkout.isPending,
    progress: checkout.isPending,
    onClick: submit,
  });

  const set = (k: keyof Form) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: ev.target.value }));

  return (
    <Screen>
      <ScreenHeader title="оформление" />

      <div className="flex flex-col gap-3.5">
        <Field label="имя и фамилия" value={form.contactName} onChange={set('contactName')} error={errors.contactName} placeholder="иван иванов" />
        <Field label="телефон" value={form.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" placeholder="+7 900 000-00-00" />
        <Field label="адрес доставки" value={form.address} onChange={set('address')} error={errors.address} placeholder="город, улица, дом, квартира" />
        <Field label="комментарий" value={form.comment} onChange={set('comment')} placeholder="необязательно" />
      </div>

      {cart && (
        <div className="card mt-5 divide-y divide-[var(--color-line)]">
          {cart.items.map((i) => (
            <div key={i.id} className="flex items-center justify-between px-3.5 py-2.5 text-[13px]">
              <span className="truncate pr-3 text-[var(--color-soft)]">
                {i.product.title} ×{i.qty}
              </span>
              <span>{money(i.product.price * i.qty)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3.5 py-3">
            <span className="text-[13px] lowercase text-[var(--color-muted)]">итого</span>
            <span className="text-[17px] font-semibold">{money(cart.total)}</span>
          </div>
        </div>
      )}

      {serverError && (
        <div className="mt-4 rounded-[3px] border border-[#c25b5b]/50 bg-[#c25b5b]/10 px-3.5 py-3 text-[13px] text-[#e08b8b]">
          {serverError}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-muted)]">
        оплата проходит внутри telegram. заказ подтверждается только после того, как платёж проверит сервер.
      </p>

      {!isTelegram && (
        <div className="mt-4">
          <Button loading={checkout.isPending} onClick={submit}>
            оплатить{cart ? ` · ${money(cart.total)}` : ''}
          </Button>
        </div>
      )}
    </Screen>
  );
}
