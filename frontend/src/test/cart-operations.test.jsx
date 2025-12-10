import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCartStore from '../stores/cartStore';

// Helper
const useCart = () => useCartStore();

/**
 * Cart Operations Tests
 * Detailed tests for cart item management and calculations
 */

describe('Cart Operations - Detailed Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();

    // Reset store
    const { clearCart, clearPreOrderContext, setTableId } = useCartStore.getState();
    act(() => {
      clearCart();
      clearPreOrderContext();
      setTableId(null);
    });

    sessionStorage.getItem.mockReturnValue(null);
  });

  describe('Adding Items to Cart', () => {
    it('should add new item to empty cart', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0]).toMatchObject({
        id: 1,
        name: 'Burger',
        quantity: 1,
        price: 12.99,
      });
    });

    it('should increment quantity when adding existing item', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 2);
      });

      expect(result.current.cart[0].quantity).toBe(2);

      act(() => {
        result.current.addToCart(burger, 3);
      });

      expect(result.current.cart).toHaveLength(1); // Still 1 item
      expect(result.current.cart[0].quantity).toBe(5); // 2 + 3 = 5
    });

    it('should handle adding multiple different items', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };
      const fries = { id: 2, name: 'Fries', price: 4.99, category: 'Side' };
      const soda = { id: 3, name: 'Soda', price: 2.50, category: 'Drink' };

      act(() => {
        result.current.addToCart(burger, 1);
        result.current.addToCart(fries, 2);
        result.current.addToCart(soda, 1);
      });

      expect(result.current.cart).toHaveLength(3);
      const { cartItemCount } = result.current.getCartTotals();
      expect(cartItemCount).toBe(4); // 1 + 2 + 1
    });

    it('should add special instructions to items', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1, 'No onions, extra cheese');
      });

      expect(result.current.cart[0].special_instructions).toBe('No onions, extra cheese');
    });
  });

  describe('Removing Items from Cart', () => {
    it('should remove item completely', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };
      const fries = { id: 2, name: 'Fries', price: 4.99, category: 'Side' };

      act(() => {
        result.current.addToCart(burger, 1);
        result.current.addToCart(fries, 1);
      });

      expect(result.current.cart).toHaveLength(2);

      act(() => {
        result.current.removeFromCart(1);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].id).toBe(2); // Only fries remain
    });

    it('should handle removing non-existent item gracefully', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1);
      });

      expect(result.current.cart).toHaveLength(1);

      act(() => {
        result.current.removeFromCart(999); // Non-existent ID
      });

      expect(result.current.cart).toHaveLength(1); // Nothing removed
    });
  });

  describe('Updating Item Quantities', () => {
    it('should update quantity to specific value', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 2);
      });

      expect(result.current.cart[0].quantity).toBe(2);

      act(() => {
        result.current.updateQuantity(1, 5);
      });

      expect(result.current.cart[0].quantity).toBe(5);
    });

    it('should remove item when quantity set to 0', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 2);
      });

      expect(result.current.cart).toHaveLength(1);

      act(() => {
        result.current.updateQuantity(1, 0);
      });

      expect(result.current.cart).toHaveLength(0);
    });

    it('should remove item when quantity set to negative', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 2);
      });

      act(() => {
        result.current.updateQuantity(1, -5);
      });

      expect(result.current.cart).toHaveLength(0);
    });
  });

  describe('Special Instructions Management', () => {
    it('should update special instructions for existing item', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1, 'No onions');
      });

      expect(result.current.cart[0].special_instructions).toBe('No onions');

      act(() => {
        result.current.updateSpecialInstructions(1, 'No onions, extra cheese');
      });

      expect(result.current.cart[0].special_instructions).toBe('No onions, extra cheese');
    });

    it('should clear special instructions', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1, 'No onions');
      });

      act(() => {
        result.current.updateSpecialInstructions(1, '');
      });

      expect(result.current.cart[0].special_instructions).toBe('');
    });
  });

  describe('Cart Calculations', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };
      const fries = { id: 2, name: 'Fries', price: 4.99, category: 'Side' };

      act(() => {
        result.current.addToCart(burger, 2); // 2 * 12.99 = 25.98
        result.current.addToCart(fries, 1);  // 1 * 4.99 = 4.99
      });

      // 25.98 + 4.99 = 30.97
      const { cartSubtotal } = result.current.getCartTotals();
      expect(cartSubtotal).toBeCloseTo(30.97, 2);
    });

    it('should calculate item count correctly', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };
      const fries = { id: 2, name: 'Fries', price: 4.99, category: 'Side' };
      const soda = { id: 3, name: 'Soda', price: 2.50, category: 'Drink' };

      act(() => {
        result.current.addToCart(burger, 3);
        result.current.addToCart(fries, 2);
        result.current.addToCart(soda, 1);
      });

      const { cartItemCount } = result.current.getCartTotals();
      expect(cartItemCount).toBe(6); // 3 + 2 + 1
    });

    it('should calculate tax correctly', () => {
      const { result } = renderHook(() => useCart());

      const item = { id: 1, name: 'Item', price: 100.00, category: 'Main' };

      act(() => {
        result.current.addToCart(item, 1);
      });

      const { cartTax, cartTotal } = result.current.getCartTotals();
      // Tax rate is 0% in current implementation
      expect(cartTax).toBe(0);
      expect(cartTotal).toBe(100.00);
    });

    it('should recalculate totals when items are removed', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };
      const fries = { id: 2, name: 'Fries', price: 4.99, category: 'Side' };

      act(() => {
        result.current.addToCart(burger, 1);
        result.current.addToCart(fries, 1);
      });

      expect(result.current.getCartTotals().cartTotal).toBeCloseTo(17.98, 2);

      act(() => {
        result.current.removeFromCart(2); // Remove fries
      });

      expect(result.current.getCartTotals().cartTotal).toBeCloseTo(12.99, 2);
    });
  });

  describe('Cart Utility Functions', () => {
    it('should check if item is in cart', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1);
      });

      expect(result.current.isInCart(1)).toBe(true);
      expect(result.current.isInCart(999)).toBe(false);
    });

    it('should get cart item by ID', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1);
      });

      const item = result.current.getCartItem(1);
      expect(item).toBeDefined();
      expect(item.name).toBe('Burger');

      const nonExistent = result.current.getCartItem(999);
      expect(nonExistent).toBeUndefined();
    });

    it('should get item quantity from cart', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 5);
      });

      expect(result.current.getItemQuantity(1)).toBe(5);
      expect(result.current.getItemQuantity(999)).toBe(0);
    });
  });

  describe('Cart Persistence', () => {
    it('should persist cart to sessionStorage', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1);
      });

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'ordereasy-storage', // Zustand storage key
        expect.stringContaining('Burger')
      );
    });

    it('should clear cart from sessionStorage when empty', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1);
      });

      act(() => {
        result.current.clearCart();
      });

      // Zustand might update the storage value to cleared state rather than removing the key
      // depending on implementation. But 'clearCart' updates state to [], so persists []

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'ordereasy-storage',
        expect.stringContaining('"cart":[]')
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle adding item with quantity 0', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 0);
      });

      // Item added but with 0 quantity
      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(0);
    });

    it('should handle very large quantities', () => {
      const { result } = renderHook(() => useCart());

      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };

      act(() => {
        result.current.addToCart(burger, 1000);
      });

      expect(result.current.cart[0].quantity).toBe(1000);
      expect(result.current.getCartTotals().cartTotal).toBeCloseTo(12990, 2);
    });

    it('should handle decimal prices correctly', () => {
      const { result } = renderHook(() => useCart());

      const item = { id: 1, name: 'Item', price: 9.99, category: 'Main' };

      act(() => {
        result.current.addToCart(item, 3);
      });

      expect(result.current.getCartTotals().cartTotal).toBeCloseTo(29.97, 2);
    });

    it('should handle price as string', () => {
      const { result } = renderHook(() => useCart());

      const item = { id: 1, name: 'Item', price: '15.99', category: 'Main' };

      act(() => {
        result.current.addToCart(item, 1);
      });

      expect(result.current.cart[0].price).toBe(15.99); // Converted to number
      expect(result.current.getCartTotals().cartTotal).toBeCloseTo(15.99, 2);
    });
  });
});
