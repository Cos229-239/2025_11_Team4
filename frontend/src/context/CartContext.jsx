import { createContext, useContext, useState, useEffect } from 'react';

// Create Cart Context
const CartContext = createContext(null);

/**
 * CartProvider Component
 * Manages shopping cart state and persists to sessionStorage
 */
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [tableId, setTableId] = useState(null);
  const [preOrderContext, setPreOrderContext] = useState(null); // { reservation_id, scheduled_for }

  // New: Full order context tracking
  const [orderContext, setOrderContext] = useState({
    orderType: null, // 'dine-in' | 'takeout' | 'reservation' | 'browse'
    restaurantId: null,
    tableNumber: null,
    reservationId: null
  });

  // Load cart from sessionStorage on mount
  useEffect(() => {
    const savedCart = sessionStorage.getItem('ordereasy_cart');
    const savedTableId = sessionStorage.getItem('ordereasy_table_id');
    const savedPreOrderContext = sessionStorage.getItem('ordereasy_preorder_context');
    const savedOrderContext = sessionStorage.getItem('ordereasy_order_context');

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from sessionStorage:', error);
      }
    }

    if (savedTableId) {
      setTableId(savedTableId);
    }

    if (savedPreOrderContext) {
      try {
        setPreOrderContext(JSON.parse(savedPreOrderContext));
      } catch (error) {
        console.error('Error loading preOrderContext from sessionStorage:', error);
      }
    }

    if (savedOrderContext) {
      try {
        setOrderContext(JSON.parse(savedOrderContext));
      } catch (error) {
        console.error('Error loading orderContext from sessionStorage:', error);
      }
    }
  }, []);

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      sessionStorage.setItem('ordereasy_cart', JSON.stringify(cart));
    } else {
      sessionStorage.removeItem('ordereasy_cart');
    }
  }, [cart]);

  // Save table ID to sessionStorage
  useEffect(() => {
    if (tableId) {
      sessionStorage.setItem('ordereasy_table_id', tableId);
    }
  }, [tableId]);

  // Save pre-order context to sessionStorage
  useEffect(() => {
    if (preOrderContext) {
      sessionStorage.setItem('ordereasy_preorder_context', JSON.stringify(preOrderContext));
    } else {
      sessionStorage.removeItem('ordereasy_preorder_context');
    }
  }, [preOrderContext]);

  // Save order context to sessionStorage
  useEffect(() => {
    if (orderContext.orderType || orderContext.restaurantId) {
      sessionStorage.setItem('ordereasy_order_context', JSON.stringify(orderContext));
    } else {
      sessionStorage.removeItem('ordereasy_order_context');
    }
  }, [orderContext]);

  /**
   * Add item to cart
   * If item exists, increment quantity
   * If item is new, add with quantity 1
   * Optionally update order context when adding from different restaurant
   */
  const addToCart = (item, quantity = 1, specialInstructions = '', context = null) => {
    // If context provided and different restaurant, warn user
    if (context && context.restaurantId && orderContext.restaurantId &&
        context.restaurantId !== orderContext.restaurantId) {
      if (!window.confirm('This will clear your current cart from another restaurant. Continue?')) {
        return;
      }
      clearCart();
      setOrderContext(context);
    } else if (context && !orderContext.restaurantId) {
      // First item being added, set context
      setOrderContext(context);
    }

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (cartItem) => cartItem.id === item.id
      );

      if (existingItemIndex !== -1) {
        // Item exists, update quantity
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity,
          special_instructions: specialInstructions || updatedCart[existingItemIndex].special_instructions,
        };
        return updatedCart;
      } else {
        // New item, add to cart
        return [
          ...prevCart,
          {
            id: item.id,
            name: item.name,
            description: item.description,
            price: parseFloat(item.price),
            category: item.category,
            image_url: item.image_url,
            quantity: quantity,
            special_instructions: specialInstructions,
          },
        ];
      }
    });
  };

  /**
   * Remove item from cart completely
   */
  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  /**
   * Update item quantity
   * If quantity is 0 or less, remove item
   */
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.id === itemId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  /**
   * Update special instructions for an item
   */
  const updateSpecialInstructions = (itemId, instructions) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.id === itemId) {
          return { ...item, special_instructions: instructions };
        }
        return item;
      });
    });
  };

  /**
   * Clear entire cart
   */
  const clearCart = () => {
    setCart([]);
    setOrderContext({
      orderType: null,
      restaurantId: null,
      tableNumber: null,
      reservationId: null
    });
    sessionStorage.removeItem('ordereasy_cart');
    sessionStorage.removeItem('ordereasy_order_context');
  };

  /**
   * Clear pre-order context
   */
  const clearPreOrderContext = () => {
    setPreOrderContext(null);
    sessionStorage.removeItem('ordereasy_preorder_context');
  };

  /**
   * Get cart item by ID
   */
  const getCartItem = (itemId) => {
    return cart.find((item) => item.id === itemId);
  };

  /**
   * Check if item is in cart
   */
  const isInCart = (itemId) => {
    return cart.some((item) => item.id === itemId);
  };

  /**
   * Get item quantity in cart
   */
  const getItemQuantity = (itemId) => {
    const item = cart.find((item) => item.id === itemId);
    return item ? item.quantity : 0;
  };

  // Calculate cart totals
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // You can add tax/service charge calculations here
  const taxRate = 0.0; // 0% tax (adjust as needed)
  const cartTax = cartSubtotal * taxRate;
  const cartTotal = cartSubtotal + cartTax;

  const value = {
    cart,
    tableId,
    setTableId,
    preOrderContext,
    setPreOrderContext,
    clearPreOrderContext,
    orderContext,
    setOrderContext,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateSpecialInstructions,
    clearCart,
    getCartItem,
    isInCart,
    getItemQuantity,
    cartItemCount,
    cartSubtotal,
    cartTax,
    cartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/**
 * useCart Hook
 * Access cart context in components
 */
export const useCart = () => {
  const context = useContext(CartContext);

  if (context === null) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
};

export default CartContext;
