import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CheckoutForm = ({ amount, onSuccess, onError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    // Make sure to change this to your payment completion page
                    return_url: `${window.location.origin}/payment-success`,
                },
                redirect: 'if_required',
            });

            if (error) {
                setErrorMessage(error.message);
                onError && onError(error.message);
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onSuccess && onSuccess(paymentIntent);
            } else {
                setErrorMessage('Payment failed. Please try again.');
                onError && onError('Payment failed');
            }
        } catch (err) {
            setErrorMessage(err.message || 'An unexpected error occurred.');
            onError && onError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-dark-surface border border-white/10 rounded-xl p-4">
                <PaymentElement
                    options={{
                        layout: 'tabs',
                        theme: 'night',
                        variables: {
                            colorPrimary: '#FA6C01',
                            colorBackground: '#1a1a1a',
                            colorText: '#ffffff',
                            colorDanger: '#ef4444',
                            fontFamily: 'Lora, serif',
                        }
                    }}
                />
            </div>

            {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${!stripe || isProcessing
                        ? 'bg-dark-surface text-text-secondary cursor-not-allowed'
                        : 'bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-brand-lime/30 pulse-lime'
                    }`}
            >
                {isProcessing ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                    </>
                ) : (
                    `Pay $${amount.toFixed(2)}`
                )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Secured by Stripe
            </div>
        </form>
    );
};

export default CheckoutForm;
