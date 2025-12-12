if (!stripeKey) {
    logger.warn('⚠️ STRIPE_SECRET_KEY missing. Webhooks disabled.');
}
const stripe = stripeKey ? require('stripe')(stripeKey) : null;
const paymentService = require('../services/payment.service');
const logger = require('../utils/logger');
const stripeKey = process.env.STRIPE_SECRET_KEY;

exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe) {
        logger.error('Webhook Error: Stripe not configured');
        return res.status(503).send('Stripe not configured');
    }

    let event;

    try {
        // req.body must be raw buffer here
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        logger.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                logger.info(`PaymentIntent was successful: ${paymentIntent.id}`);

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
                logger.info(`PaymentIntent failed: ${failedIntent.id}`);
                // Optional: Add logic to notify user or release reservation hold
                break;

            default:
                logger.info(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        logger.error('Error processing webhook event:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
