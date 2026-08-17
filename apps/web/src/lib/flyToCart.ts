/**
 * Fly-to-cart: клон фото товара летит по дуге в иконку корзины и «схлопывается».
 * Чисто визуально, без зависимостей — WAAPI. Иконку корзины находим по data-cart.
 */
export function flyToCart(fromEl: HTMLElement | null) {
  if (!fromEl) return;
  const target = document.querySelector<HTMLElement>('[data-cart-icon]');
  if (!target) return;

  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (a.width === 0) return;

  const ghost = fromEl.cloneNode(true) as HTMLElement;
  const size = Math.min(a.width, 96);
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${a.left + a.width / 2 - size / 2}px`,
    top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'cover',
    borderRadius: '10px',
    zIndex: '90',
    pointerEvents: 'none',
    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
  } as CSSStyleDeclaration);
  document.body.appendChild(ghost);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);

  const anim = ghost.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(0.8)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.2 },
    ],
    { duration: 700, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' },
  );
  anim.onfinish = () => {
    ghost.remove();
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
  };
}
