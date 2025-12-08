import useCartStore from '../stores/cartStore';

export const useCart = () => {
    const store = useCartStore();
    const totals = store.getCartTotals();

    return {
        ...store,
        ...totals,
    };
};

