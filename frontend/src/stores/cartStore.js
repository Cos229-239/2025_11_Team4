import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useCartStore = create(
    persist(
        (set, get) => ({
            cart: [],
            tableId: null,
            preOrderContext: null, // { reservation_id, scheduled_for }
            orderContext: {
                orderType: null, // 'dine-in' | 'takeout' | 'reservation' | 'browse'
                restaurantId: null,
                tableNumber: null,
                reservationId: null
            },

            // Modal state (moved to local component state where possible, but kept here if global access needed)
            // Ideally modals should be triggered by the UI responding to state changes or return values
            // but for migration parity we'll expose a flag or callback mechanism if needed. 
            // Better approach with Zustand: The UI component subscribes to the store and shows modal if needed.
            // For now, we will handle the "different restaurant" check in the action and return a result
            // that the UI can use to show a modal, OR we store a "pendingItem" state.

            setTableId: (id) => set({ tableId: id }),

            setPreOrderContext: (context) => set({ preOrderContext: context }),
            clearPreOrderContext: () => set({ preOrderContext: null }),

            setOrderContext: (context) => set((state) => ({
                orderContext: { ...state.orderContext, ...context }
            })),

            clearCart: () => set({
                cart: [],
                orderContext: {
                    orderType: null,
                    restaurantId: null,
                    tableNumber: null,
                    reservationId: null
                }
            }),

            addToCart: (item, quantity = 1, specialInstructions = '', context = null) => {
                const { cart, orderContext, clearCart, setOrderContext } = get();

                // Restaurant mismatch check
                if (context && context.restaurantId && orderContext.restaurantId &&
                    context.restaurantId !== orderContext.restaurantId) {
                    // Return false or specific object to indicate mismatch
                    // The UI calling this function will handle the modal
                    return { success: false, reason: 'DIFFERENT_RESTAURANT', context, item, quantity, specialInstructions };
                }

                // If context provided (first item or update), update it
                if (context) {
                    setOrderContext(context);
                }

                const existingItemIndex = cart.findIndex((cartItem) => cartItem.id === item.id);
                let updatedCart = [...cart];

                if (existingItemIndex !== -1) {
                    // Update existing
                    updatedCart[existingItemIndex] = {
                        ...updatedCart[existingItemIndex],
                        quantity: updatedCart[existingItemIndex].quantity + quantity,
                        special_instructions: specialInstructions || updatedCart[existingItemIndex].special_instructions,
                    };
                } else {
                    // Add new
                    updatedCart.push({
                        id: item.id,
                        name: item.name,
                        description: item.description,
                        price: parseFloat(item.price),
                        category: item.category,
                        image_url: item.image_url,
                        quantity: quantity,
                        special_instructions: specialInstructions,
                    });
                }

                set({ cart: updatedCart });
                return { success: true };
            },

            removeFromCart: (itemId) => set((state) => ({
                cart: state.cart.filter((item) => item.id !== itemId)
            })),

            updateQuantity: (itemId, newQuantity) => {
                const { removeFromCart } = get();
                if (newQuantity <= 0) {
                    removeFromCart(itemId);
                    return;
                }

                set((state) => ({
                    cart: state.cart.map((item) =>
                        item.id === itemId ? { ...item, quantity: newQuantity } : item
                    )
                }));
            },

            updateSpecialInstructions: (itemId, instructions) => set((state) => ({
                cart: state.cart.map((item) =>
                    item.id === itemId ? { ...item, special_instructions: instructions } : item
                )
            })),

            // Getters can be derived in the component, but we can expose helpers
            getCartItem: (itemId) => get().cart.find((item) => item.id === itemId),
            isInCart: (itemId) => get().cart.some((item) => item.id === itemId),
            getItemQuantity: (itemId) => {
                const item = get().cart.find((item) => item.id === itemId);
                return item ? item.quantity : 0;
            },

            getCartTotals: () => {
                const { cart } = get();
                const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
                const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
                const taxRate = 0.0;
                const cartTax = cartSubtotal * taxRate;
                const cartTotal = cartSubtotal + cartTax;
                return { cartItemCount, cartSubtotal, cartTax, cartTotal };
            }
        }),
        {
            name: 'ordereasy-storage', // unique name
            storage: createJSONStorage(() => sessionStorage), // persist to sessionStorage
            partialize: (state) => ({
                cart: state.cart,
                tableId: state.tableId,
                preOrderContext: state.preOrderContext,
                orderContext: state.orderContext
            }), // Select fields to persist
        }
    )
);

export default useCartStore;
