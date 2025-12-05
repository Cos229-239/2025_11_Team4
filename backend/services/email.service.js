const nodemailer = require('nodemailer');

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send an email receipt for an order
 * @param {Object} order - The order object
 * @param {string} userEmail - The customer's email address
 */
const sendOrderReceipt = async (order, userEmail) => {
    if (process.env.SEND_EMAILS !== 'true') {
        console.log('Email sending is disabled. Skipping receipt email.');
        return;
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: userEmail,
            subject: `Order Receipt - Order #${order.id}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your order!</h2>
          <p>Your order #${order.id} has been received.</p>
          
          <h3>Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #ddd;">
                <th style="text-align: left; padding: 8px;">Item</th>
                <th style="text-align: right; padding: 8px;">Price</th>
                <th style="text-align: right; padding: 8px;">Qty</th>
                <th style="text-align: right; padding: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td style="padding: 8px;">${item.name}</td>
                  <td style="text-align: right; padding: 8px;">$${Number(item.price).toFixed(2)}</td>
                  <td style="text-align: right; padding: 8px;">${item.quantity}</td>
                  <td style="text-align: right; padding: 8px;">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; text-align: right;">
            <p>Subtotal: $${Number(order.total_amount - (order.tip_amount || 0)).toFixed(2)}</p>
            <p>Tip: $${Number(order.tip_amount || 0).toFixed(2)}</p>
            <h3 style="margin-top: 10px;">Total: $${Number(order.total_amount).toFixed(2)}</h3>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            If you have any questions, please contact us at support@ordereasy.app.
          </p>
        </div>
      `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent blocking the order flow
        return null;
    }
};

module.exports = {
    sendOrderReceipt,
};
