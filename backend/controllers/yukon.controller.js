const logger = require('../utils/logger');

// Simulated AI response logic for "Yukon"
// In the future, this can be replaced with an actual LLM call (OpenAI, Gemini, etc.)

exports.handleChat = async (req, res) => {
    try {
        const { message, context } = req.body;
        const userMessage = message.toLowerCase();

        // Default response
        let reply = "I'm not sure how to help with that yet. You can ask me about 'orders', 'staff', 'inventory', or 'stats'.";

        // 1. GREETINGS
        if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
            reply = "Hello Chef! How can I assist you in the kitchen today?";
        }

        // 2. ACTIVE ORDERS QUERY (ANALYTICS)
        else if (userMessage.includes('order') || userMessage.includes('ticket') || userMessage.includes('analytics') || userMessage.includes('stats')) {
            const count = context?.stats?.totalOrders || 0;
            const pending = context?.stats?.pending || 0;

            if (count === 0) {
                reply = "There are currently no active orders. The kitchen is quiet.";
            } else {
                reply = `There are ${count} active orders right now (${pending} pending). Check the board for details!`;
            }
        }

        // 3. STAFF / EMPLOYEE QUERY
        else if (userMessage.includes('staff') || userMessage.includes('who') || userMessage.includes('working') || userMessage.includes('employee')) {
            const employees = context?.employees || [];
            const onDuty = employees.filter(e => e.on_duty);

            if (onDuty.length === 0) {
                reply = "It looks like no one is clocked in right now.";
            } else {
                const names = onDuty.map(e => e.name).join(', ');
                reply = `There are ${onDuty.length} staff members on duty: ${names}.`;
            }
        }

        // 4. INVENTORY QUERY
        else if (userMessage.includes('inventory') || userMessage.includes('low') || userMessage.includes('stock')) {
            // Simple check for low stock in the provided context
            const inventory = context?.inventory || [];
            const lowStock = inventory.filter(item => item.quantity < 10); // Arbitrary threshold

            if (lowStock.length > 0) {
                const items = lowStock.map(i => `${i.item} (${i.quantity} ${i.unit})`).join(', ');
                reply = `Warning! The following items are running low: ${items}.`;
            } else {
                reply = "Inventory looks healthy! No items are critically low.";
            }
        }

        // 5. OCCUPANCY QUERY
        else if (userMessage.includes('busy') || userMessage.includes('people') || userMessage.includes('seat') || userMessage.includes('occupancy') || userMessage.includes('reservation')) {
            const occupancy = context?.stats?.occupancy || 0;
            reply = `We currently have about ${occupancy} guests seated based on active orders.`;
        }

        res.json({
            success: true,
            reply: reply
        });

    } catch (error) {
        logger.error('Yukon Chat Error:', error);
        res.status(500).json({
            success: false,
            reply: "I'm having a bit of a meltdown. Please try again later."
        });
    }
};
