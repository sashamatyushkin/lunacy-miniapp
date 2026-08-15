import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api';
import type { Cart } from '../lib/types';
import { haptic } from '../lib/telegram';
import { track } from '../lib/analytics';

const KEY = ['cart'];

export function useCart(enabled = true) {
  return useQuery({ queryKey: KEY, queryFn: () => get<Cart>('/api/cart'), enabled });
}

export function useCartMutations() {
  const qc = useQueryClient();
  const commit = (data: Cart) => qc.setQueryData(KEY, data);

  const add = useMutation({
    mutationFn: (v: { productId: string; qty?: number }) => post<Cart>('/api/cart', v),
    onSuccess: (data, v) => {
      commit(data);
      haptic.success();
      track('add_to_cart', { productId: v.productId });
    },
    onError: () => haptic.error(),
  });

  const setQty = useMutation({
    mutationFn: (v: { productId: string; qty: number }) => patch<Cart>(`/api/cart/${v.productId}`, { qty: v.qty }),
    onSuccess: (data) => {
      commit(data);
      haptic.select();
    },
  });

  const clear = useMutation({
    mutationFn: () => del<Cart>('/api/cart'),
    onSuccess: commit,
  });

  return { add, setQty, clear };
}
