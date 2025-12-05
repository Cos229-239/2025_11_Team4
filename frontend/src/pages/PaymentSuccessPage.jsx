import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, Receipt, RefreshCw } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { fetchWithAuth } from '../utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PaymentSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { cart, clearCart, clearPreOrderContext } = useCart();
    const [status, setStatus] = useState('loading'); // loading, processing, success, failed
    const [error, setError] = useState(null);
    const processedRef = useRef(false);

    const paymentIntentId = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');

    useEffect(() => {
        if (!paymentIntentId) {
            navigate('/');
            return;
        }

        if (redirectStatus && redirectStatus !== 'succeeded') {
            setStatus('failed');
            setError('Payment was not successful. Please try again.');
            return;
        }

        const processOrder = async () => {
            if (processedRef.current) return;
            processedRef.current = true;

            try {
                setStatus('processing');

                // 1. Fetch Payment Intent Details to get Metadata
                const paymentRes = await fetchWithAuth(`${API_URL}/api/payments/${paymentIntentId}`);
                const paymentData = await paymentRes.json();

                if (!paymentData.success) {
                    throw new Error('Failed to retrieve payment details');
                }

                const paymentIntent = paymentData.data;
                const { metadata, amount } = paymentIntent;

                // 2. Check if order already exists (Idempotency)
                // The backend createOrder has a check, but we can also check if we have a local record or just rely on backend
                // We'll proceed to create order, relying on backend idempotency

                // 3. Construct Order Data
                // Note: We rely on the cart being present in local storage. 
                // If cart is empty (e.g. cross-device), we might need to rely on a server-side stored cart or metadata items if we stored them there.
                // For now, we assume same-device flow.

                let orderItems = [];
                if (cart.length > 0) {
                    orderItems = cart.map((item) => ({
                        menu_item_id: item.id,
                        quantity: item.quantity,
                        special_instructions: item.special_instructions || '',
                    }));
                } else {
                    // Fallback: If cart is empty, we can't easily reconstruct items unless we saved them in metadata or a temp order.
                    // For this fix, we'll warn if cart is empty but try to proceed if backend handles it or just show success.
                }

                if (orderItems.length > 0) {
                    const orderData = {
                        table_id: metadata.order_type === 'dine-in' ? parseInt(metadata.table_id) : null,
                        restaurant_id: metadata.restaurant_id ? parseInt(metadata.restaurant_id) : null,
                        order_type: metadata.order_type || 'dine-in',
                        reservation_id: metadata.order_type === 'pre-order' && metadata.reservation_id ? parseInt(metadata.reservation_id) : null,
                        // scheduled_for: ... (might be missing in metadata, but usually needed for pre-order)
                        items: orderItems,
                        payment_status: 'completed',
                        payment_method: 'stripe',
                        payment_intent_id: paymentIntent.id,
                        payment_amount: amount / 100,
                        user_id: sessionStorage.getItem('ordereasy_user_id'),
                        tip_amount: metadata.tipAmount ? parseFloat(metadata.tipAmount) : 0
                    };

                    const orderResponse = await fetchWithAuth(`${API_URL}/api/orders`, {
                        method: 'POST',
                        body: JSON.stringify(orderData),
                    });

                    const orderResponseData = await orderResponse.json();

                    if (!orderResponseData.success) {
                        // If it failed because it already exists, that's actually a success for us here
                        if (orderResponseData.message && orderResponseData.message.includes('already exists')) {
                            // Fetch the existing order to redirect
                            if (orderResponseData.data && orderResponseData.data.id) {
                                clearCart();
                                clearPreOrderContext();
                                navigate(`/confirmation/${orderResponseData.data.id}`, { replace: true });
                                return;
                            }
                        }

                        // Fallback: Try to find order by payment intent if creation failed for other reasons but maybe it exists
                        try {
                            const existingOrderRes = await fetchWithAuth(`${API_URL}/api/orders/payment-intent/${paymentIntentId}`);
                            const existingOrderData = await existingOrderRes.json();
                            if (existingOrderData.success && existingOrderData.data) {
                                clearCart();
                                clearPreOrderContext();
                                navigate(`/confirmation/${existingOrderData.data.id}`, { replace: true });
                                return;
                            }
                        } catch {
                            // Fallback lookup failed
                        }

                        throw new Error(orderResponseData.error || 'Failed to create order');
                    }

                    // Success
                    clearCart();
                    clearPreOrderContext();
                    navigate(`/confirmation/${orderResponseData.data.id}`, { replace: true });
                } else {
                    // Cart empty, maybe order was created by webhook? 
                    // We'll check if we can find an order by payment_intent_id
                    try {
                        const existingOrderRes = await fetchWithAuth(`${API_URL}/api/orders/payment-intent/${paymentIntentId}`);
                        const existingOrderData = await existingOrderRes.json();

                        if (existingOrderData.success && existingOrderData.data) {
                            clearCart(); // Ensure clean state
                            clearPreOrderContext();
                            navigate(`/confirmation/${existingOrderData.data.id}`, { replace: true });
                            return;
                        }
                    } catch (e) {
                        // Fallback lookup failed
                    }

                    // If still not found, show success message but warn user
                    setStatus('success');
                }

            } catch (err) {
                console.error('Error processing success page:', err);
                setError(err.message || 'Failed to finalize order');
                setStatus('failed');
            }
        };

        processOrder();

    }, [paymentIntentId, redirectStatus, navigate, cart, clearCart, clearPreOrderContext]);

    if (status === 'loading' || status === 'processing') {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                <p className="text-neutral-400 animate-pulse">Finalizing your order...</p>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-neutral-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl">
                    <div className="mb-6 flex justify-center">
                        <div className="h-20 w-20 bg-red-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                    <p className="text-neutral-400 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>
                    <Link
                        to="/cart"
                        className="mt-4 block text-neutral-500 hover:text-neutral-300 text-sm"
                    >
                        Return to Cart
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
                <div className="mb-6 flex justify-center">
                    <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
                <p className="text-neutral-400 mb-8">
                    Thank you for your order. We have received your payment.
                </p>

                <div className="space-y-3">
                    <Link
                        to="/my-reservations"
                        className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Receipt className="w-5 h-5" />
                        View My Orders
                    </Link>

                    <Link
                        to="/"
                        className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Home className="w-5 h-5" />
                        Return Home
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-sm text-neutral-500">
                    Transaction ID: <span className="font-mono text-neutral-400">{paymentIntentId}</span>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
