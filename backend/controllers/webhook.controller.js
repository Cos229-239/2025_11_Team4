const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.warn('⚠️ STRIPE_SECRET_KEY missing. Webhooks disabled.');
}
const stripe = stripeKey ? require('stripe')(stripeKey) : null;
const paymentService = require('../services/payment.service');

exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe) {
        console.error('Webhook Error: Stripe not configured');
        return res.status(503).send('Stripe not configured');
    }

    let event;

    try {
        // req.body must be raw buffer here
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                console.log(`PaymentIntent was successful: ${paymentIntent.id}`);

                // Extract metadata
                const { reservationId, reservationIntent } = paymentIntent.metadata || {};

                await paymentService.confirmPaymentLogic({
                    paymentIntentId: paymentIntent.id,
                    paymentStatus: 'succeeded',
                    reservationId: reservationId ? parseInt(reservationId) : null,
                    reservationIntent,
                    userId: null // Webhooks are system actions, no user auth context
                });
                break;
            }

            case 'payment_intent.payment_failed':
                const failedIntent = event.data.object;
                console.log(`PaymentIntent failed: ${failedIntent.id}`);
                // Optional: Add logic to notify user or release reservation hold
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Error processing webhook event:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
