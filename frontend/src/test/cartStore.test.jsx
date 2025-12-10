import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCartStore from '../stores/cartStore';

describe('cartStore', () => {
  beforeEach(() => {
    // Clear sessionStorage and store state before each test
    sessionStorage.clear();
    vi.clearAllMocks();

    // Reset store state
    const { clearCart, clearPreOrderContext, setTableId } = useCartStore.getState();
    act(() => {
      clearCart();
      clearPreOrderContext();
      setTableId(null);
    });
  });

  describe('Pre-Order Context Management', () => {
    it('should initialize with null preOrderContext', () => {
      const { result } = renderHook(() => useCartStore());
      expect(result.current.preOrderContext).toBeNull();
    });

    it('should set and persist preOrderContext', () => {
      const { result } = renderHook(() => useCartStore());
      const mockContext = {
        reservation_id: 123,
        scheduled_for: '2025-01-15T19:00:00Z',
      };

      act(() => {
        result.current.setPreOrderContext(mockContext);
      });

      expect(result.current.preOrderContext).toEqual(mockContext);
      // Verify persistence (Zustand persist middleware handles this via JSON.parse/stringify internally)
      // Accessing sessionStorage directly to verify
      const stored = sessionStorage.getItem('ordereasy-storage');
      expect(stored).toContain('"reservation_id":123');
    });

    it('should clear preOrderContext', () => {
      const { result } = renderHook(() => useCartStore());
      const mockContext = { reservation_id: 123 };

      act(() => {
        result.current.setPreOrderContext(mockContext);
      });
      expect(result.current.preOrderContext).toEqual(mockContext);

      act(() => {
        result.current.clearPreOrderContext();
      });

      expect(result.current.preOrderContext).toBeNull();
    });
  });

  describe('Cart Management', () => {
    it('should add items to cart', () => {
      const { result } = renderHook(() => useCartStore());
      const mockItem = {
        id: 1,
        name: 'Burger',
        price: 12.99,
        category: 'Main',
      };

      act(() => {
        result.current.addToCart(mockItem, 2);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0]).toMatchObject({
        id: 1,
        name: 'Burger',
        quantity: 2,
      });

      const { cartItemCount, cartTotal } = result.current.getCartTotals();
      expect(cartItemCount).toBe(2);
      expect(cartTotal).toBe(25.98);
    });

    it('should clear cart', () => {
      const { result } = renderHook(() => useCartStore());
      const mockItem = { id: 1, name: 'Burger', price: 12.99 };

      act(() => {
        result.current.addToCart(mockItem, 1);
      });
      expect(result.current.cart).toHaveLength(1);

      act(() => {
        result.current.clearCart();
      });
      expect(result.current.cart).toHaveLength(0);
    });
  });

  describe('Table ID Management', () => {
    it('should set and persist table ID', () => {
      const { result } = renderHook(() => useCartStore());
      act(() => {
        result.current.setTableId('5');
      });

      expect(result.current.tableId).toBe('5');
      const stored = sessionStorage.getItem('ordereasy-storage');
      expect(stored).toContain('"tableId":"5"');
    });
  });
});
