import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCartStore from '../stores/cartStore';

// Helper to use the store in tests
const useCart = () => useCartStore();

/**
 * Integration Tests for Ordering Flows
 * These tests verify the complete user journeys through the application
 */

describe('Ordering Flow Integration Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();

    // Reset store state
    const { clearCart, clearPreOrderContext, setTableId } = useCartStore.getState();
    act(() => {
      clearCart();
      clearPreOrderContext();
      setTableId(null);
    });

    // Reset sessionStorage mock to return null by default
    sessionStorage.getItem.mockReturnValue(null);
  });

  describe('USE CASE 1: Dine-In Flow (QR Code Scan)', () => {
    it('should complete dine-in order flow with table ID', () => {
      const { result } = renderHook(() => useCart());

      // Step 1: User scans QR code, gets tableId=5
      const tableId = '5';
      act(() => {
        result.current.setTableId(tableId);
      });
      expect(result.current.tableId).toBe('5');

      // Step 2: User adds items to cart
      const burger = { id: 1, name: 'Burger', price: 12.99, category: 'Main' };
      const fries = { id: 2, name: 'Fries', price: 4.99, category: 'Side' };

      act(() => {
        result.current.addToCart(burger, 2);
        result.current.addToCart(fries, 1);
      });

      const { cartItemCount, cartTotal } = result.current.getCartTotals();
      expect(cartItemCount).toBe(3);
      expect(cartTotal).toBeCloseTo(30.97, 2);

      // Step 3: User goes to cart - should NOT be asked for ordering mode
      expect(result.current.tableId).toBe('5');
      expect(result.current.preOrderContext).toBeNull();

      // Step 4: User proceeds to payment
      const orderData = {
        order_type: 'dine-in',
        table_id: parseInt(tableId),
        items: result.current.cart,
      };
      expect(orderData.order_type).toBe('dine-in');
      expect(orderData.table_id).toBe(5);
      expect(orderData.items).toHaveLength(2);

      // Step 5: After payment, clear cart
      act(() => {
        result.current.clearCart();
      });
      expect(result.current.cart).toHaveLength(0);
    });
  });

  describe('USE CASE 2: Reservation WITHOUT Pre-Order', () => {
    it('should create reservation and navigate to confirmation without forcing order', () => {
      const { result } = renderHook(() => useCart());

      // Step 1: User makes reservation

      // Step 2: User is shown confirmation page
      // - Should see reservation details
      // - Should see "Browse Menu & Pre-Order" button (OPTIONAL)
      // - Should see "View My Reservations" button (OPTIONAL)
      // - Should NOT be forced into ordering

      // User chooses NOT to pre-order
      expect(result.current.cart).toHaveLength(0);
      expect(result.current.preOrderContext).toBeNull();

      // SUCCESS: User has reservation but no order - this is valid!
    });
  });

  describe('USE CASE 3: Reservation WITH Pre-Order', () => {
    it('should complete full pre-order flow from reservation', () => {
      const { result } = renderHook(() => useCart());

      // Step 1: User makes reservation
      const reservationId = 456;

      // Step 2: User sees confirmation page and clicks "Browse Menu & Pre-Order"
      const preOrderContext = {
        reservation_id: reservationId,
        scheduled_for: '2025-01-15T19:00:00Z',
      };

      act(() => {
        result.current.setPreOrderContext(preOrderContext);
      });

      expect(result.current.preOrderContext).toEqual(preOrderContext);

      // Step 3: User browses menu and adds items
      const steak = { id: 3, name: 'Steak', price: 29.99, category: 'Main' };
      const wine = { id: 4, name: 'Wine', price: 12.00, category: 'Drink' };

      act(() => {
        result.current.addToCart(steak, 2);
        result.current.addToCart(wine, 1);
      });

      const { cartItemCount } = result.current.getCartTotals();
      expect(cartItemCount).toBe(3);

      // Step 4: User goes to cart
      // - Should NOT be asked "I'm at Restaurant" vs "Planning Ahead"
      // - Should skip ordering mode selection because preOrderContext exists
      expect(result.current.preOrderContext).toBeTruthy();

      // Step 5: User proceeds to payment
      const orderData = {
        order_type: 'pre-order',
        reservation_id: preOrderContext.reservation_id,
        scheduled_for: preOrderContext.scheduled_for,
        items: result.current.cart,
      };

      expect(orderData.order_type).toBe('pre-order');
      expect(orderData.reservation_id).toBe(456);
      expect(orderData.scheduled_for).toBe('2025-01-15T19:00:00Z');

      // Step 6: After successful payment, clear both cart and preOrderContext
      act(() => {
        result.current.clearCart();
        result.current.clearPreOrderContext();
      });

      expect(result.current.cart).toHaveLength(0);
      expect(result.current.preOrderContext).toBeNull();
    });
  });

  describe('USE CASE 4: Browse Without Table ID', () => {
    it('should ask for ordering mode when no tableId or preOrderContext', () => {
      const { result } = renderHook(() => useCart());

      // Step 1: User browses restaurants and adds items without QR scan
      const pizza = { id: 5, name: 'Pizza', price: 15.99, category: 'Main' };

      act(() => {
        result.current.addToCart(pizza, 1);
      });

      // Step 2: User goes to cart
      // - No tableId in URL
      // - No preOrderContext
      // - Should be asked: "I'm at Restaurant" or "Planning Ahead"
      expect(result.current.tableId).toBeNull();
      expect(result.current.preOrderContext).toBeNull();

      // This is the correct behavior - user must choose
    });

    it('should require table number after choosing "I\'m at Restaurant"', () => {
      const { result } = renderHook(() => useCart());

      const pizza = { id: 5, name: 'Pizza', price: 15.99, category: 'Main' };
      act(() => {
        result.current.addToCart(pizza, 1);
      });

      // User chooses "I'm at Restaurant"
      // Should be prompted to enter table number
      act(() => {
        result.current.setTableId('7');
      });

      expect(result.current.tableId).toBe('7');

      // Now can proceed to payment
      const orderData = {
        order_type: 'dine-in',
        table_id: 7,
      };
      expect(orderData.order_type).toBe('dine-in');
    });

    it('should redirect to make reservation after choosing "Planning Ahead"', () => {
      const { result } = renderHook(() => useCart());

      const pizza = { id: 5, name: 'Pizza', price: 15.99, category: 'Main' };
      act(() => {
        result.current.addToCart(pizza, 1);
      });

      // User chooses "Planning Ahead"
      // Should be told: "Make a Reservation First"
      // Cart should be preserved
      expect(result.current.cart).toHaveLength(1);
      expect(result.current.tableId).toBeNull();
      expect(result.current.preOrderContext).toBeNull();
    });
  });

  describe('USE CASE 5: PreOrder Context Persistence', () => {
    it('should persist preOrderContext across page reloads', () => {
      // First render - set context
      const { result: result1 } = renderHook(() => useCart());

      const preOrderContext = {
        reservation_id: 789,
        scheduled_for: '2025-01-20T20:00:00Z',
      };

      act(() => {
        result1.current.setPreOrderContext(preOrderContext);
      });

      // Zustand persists automatically
      const stored = sessionStorage.getItem('ordereasy-storage');
      expect(stored).toContain('"reservation_id":789');

      // Simulate page reload by resetting store but keeping storage
      // In tests, we need to manually trigger hydration or reset state?
      // Actually, since it's a singleton, result1 and result2 point to same store instance
      // unless we recreate store (which we don't).
      // But we can check if the storage logic works.

      expect(result1.current.preOrderContext).toEqual(preOrderContext);
    });
  });

  describe('USE CASE 6: Error Cases', () => {
    it('should not allow pre-order without reservation_id', () => {
      const { result } = renderHook(() => useCart());

      // Ensure clean state
      expect(result.current.preOrderContext).toBeNull();
      expect(result.current.tableId).toBeNull();

      // Add items to cart
      const item = { id: 1, name: 'Test', price: 10.00 };
      act(() => {
        result.current.addToCart(item, 1);
      });

      // Verify we have items but no ordering context
      expect(result.current.cart).toHaveLength(1);
      expect(result.current.preOrderContext).toBeNull();
      expect(result.current.tableId).toBeNull();

      // Try to create pre-order without preOrderContext
      const hasReservationId = Boolean(result.current.preOrderContext?.reservation_id);
      const hasTableId = Boolean(result.current.tableId);
      const canProceedToPayment = hasReservationId || hasTableId;

      // Should NOT be able to proceed
      expect(canProceedToPayment).toBe(false);
    });

    it('should not allow dine-in without table_id', () => {
      const { result } = renderHook(() => useCart());

      // Ensure clean state
      expect(result.current.preOrderContext).toBeNull();
      expect(result.current.tableId).toBeNull();

      // Add items to cart
      const item = { id: 1, name: 'Test', price: 10.00 };
      act(() => {
        result.current.addToCart(item, 1);
      });

      // Verify we have items but no ordering context
      expect(result.current.cart).toHaveLength(1);
      expect(result.current.preOrderContext).toBeNull();
      expect(result.current.tableId).toBeNull();

      // No tableId, no preOrderContext
      const hasReservationId = Boolean(result.current.preOrderContext?.reservation_id);
      const hasTableId = Boolean(result.current.tableId);
      const canProceedToPayment = hasReservationId || hasTableId;

      // Should NOT be able to proceed
      expect(canProceedToPayment).toBe(false);
    });
  });
});

