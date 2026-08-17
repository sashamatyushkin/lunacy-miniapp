import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { money } from '../lib/types';
import { Screen, ScreenHeader } from '../components/Screen';
import { Button, Field } from '../components/ui';
import { useBackButton, useMainButton } from '../lib/tgHooks';
import { haptic, isTelegram } from '../lib/telegram';
import { cart, useCart } from '../store/cart';
import { createOrder, type CheckoutForm } from '../lib/orders';
import { track } from '../lib/analytics';

type Errors = Partial<Record<keyof CheckoutForm, string>>;

const STORAGE_KEY = 'lunacy_checkout';

function validate(f: CheckoutForm): Errors {
  const e: Errors = {};
  if (f.contactName.trim().length < 2) e.contactName = 'укажите имя';
  if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'укажите телефон';
  if (f.address.trim().length < 5) e.address = 'укажите адрес доставки';
  return e;
}

export default function Checkout() {
  const navigate = useNavigate();
  const data = useCart();
  const [form, setForm] = useState<CheckoutForm>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CheckoutForm) : { contactName: '', phone: '', address: '', comment: '' };
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  // Оформление само очищает корзину — тогда «пустая корзина → назад» срабатывать
  // не должно, иначе редирект перебьёт переход на страницу заказа.
  const placing = useRef(false);

  useBackButton(() => navigate(-1));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    if (data.items.length === 0 && !placing.current) navigate('/cart', { replace: true });
  }, [data.items.length, navigate]);

  const submit = async () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      haptic.error();
      return;
    }
    setBusy(true);
    placing.current = true;
    track('checkout_start', { total: data.total });
    try {
      const order = await createOrder(
        {
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          comment: form.comment?.trim() || undefined,
        },
        data,
      );
      cart.clear();
      haptic.success();
      navigate(`/pay/${order.id}`, { replace: true });
    } catch {
      haptic.error();
      placing.current = false;
      setBusy(false);
    }
  };

  useMainButton({
    text: `к оплате · ${money(data.total)}`,
    active: !busy,
    progress: busy,
    onClick: submit,
  });

  const set = (k: keyof CheckoutForm) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: ev.target.value }));

  return (
    <Screen>
      <ScreenHeader title="оформление" />

      <div className="flex flex-col gap-3.5">
        <Field label="имя и фамилия" value={form.contactName} onChange={set('contactName')} error={errors.contactName} placeholder="иван иванов" />
        <Field label="телефон" value={form.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" placeholder="+7 900 000-00-00" />
        <Field label="адрес доставки" value={form.address} onChange={set('address')} error={errors.address} placeholder="город, улица, дом, квартира" />
        <Field label="комментарий" value={form.comment ?? ''} onChange={set('comment')} placeholder="необязательно" />
      </div>

      <div className="card mt-5 divide-y divide-[var(--color-line)]">
        {data.items.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-3.5 py-2.5 text-[13px]">
            <span className="truncate pr-3 text-[var(--color-soft)]">
              {i.product.title} ×{i.qty}
            </span>
            <span>{money(i.product.price * i.qty)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3.5 py-3">
          <span className="text-[13px] lowercase text-[var(--color-muted)]">итого</span>
          <span className="text-[17px] font-semibold">{money(data.total)}</span>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-muted)]">
        заполните данные доставки и переходите к оплате.
      </p>

      {!isTelegram && (
        <div className="mt-4">
          <Button loading={busy} onClick={submit}>
            к оплате · {money(data.total)}
          </Button>
        </div>
      )}
    </Screen>
  );
}
