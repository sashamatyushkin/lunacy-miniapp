import { post } from './api';

export type EventName =
  | 'app_open'
  | 'onboarding_start'
  | 'onboarding_complete'
  | 'screen_view'
  | 'button_click'
  | 'product_open'
  | 'add_to_cart'
  | 'cart_open'
  | 'checkout_start'
  | 'payment_open'
  | 'payment_success'
  | 'story_open'
  | 'referral_share';

/** Fire-and-forget: analytics must never break a user flow. */
export function track(name: EventName, props: Record<string, unknown> = {}) {
  void post('/api/events', { name, props }).catch(() => {});
}
