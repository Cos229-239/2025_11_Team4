import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../context/CartContext';

describe('CartContext', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('Pre-Order Context Management', () => {
    it('should initialize with null preOrderContext', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(result.current.preOrderContext).toBeNull();
    });

    it('should set and persist preOrderContext', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const mockContext = {
        reservation_id: 123,
        scheduled_for: '2025-01-15T19:00:00Z',
      };

      act(() => {
        result.current.setPreOrderContext(mockContext);
      });

      expect(result.current.preOrderContext).toEqual(mockContext);
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'ordereasy_preorder_context',
        JSON.stringify(mockContext)
      );
    });

    it('should clear preOrderContext', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const mockContext = {
        reservation_id: 123,
        scheduled_for: '2025-01-15T19:00:00Z',
      };

      act(() => {
        result.current.setPreOrderContext(mockContext);
      });

      expect(result.current.preOrderContext).toEqual(mockContext);

      act(() => {
        result.current.clearPreOrderContext();
      });

      expect(result.current.preOrderContext).toBeNull();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('ordereasy_preorder_context');
    });

    it('should load preOrderContext from sessionStorage on mount', () => {
      const mockContext = {
        reservation_id: 456,
        scheduled_for: '2025-01-20T20:00:00Z',
      };

      sessionStorage.getItem.mockImplementation((key) => {
        if (key === 'ordereasy_preorder_context') {
          return JSON.stringify(mockContext);
        }
        return null;
      });

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(result.current.preOrderContext).toEqual(mockContext);
    });
  });

  describe('Cart Management', () => {
    it('should add items to cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

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
      expect(result.current.cartItemCount).toBe(2);
      expect(result.current.cartTotal).toBe(25.98);
    });

    it('should clear cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const mockItem = {
        id: 1,
        name: 'Burger',
        price: 12.99,
      };

      act(() => {
        result.current.addToCart(mockItem, 1);
      });

      expect(result.current.cart).toHaveLength(1);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart).toHaveLength(0);
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('ordereasy_cart');
    });
  });

  describe('Table ID Management', () => {
    it('should set and persist table ID', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.setTableId('5');
      });

      expect(result.current.tableId).toBe('5');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('ordereasy_table_id', '5');
    });
  });
});
