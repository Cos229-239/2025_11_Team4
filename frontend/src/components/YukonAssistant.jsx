import React, { useState, useRef, useEffect } from 'react';
import yukonImage from '../assets/yukon-chef.png';
import { PaperAirplaneIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { updateOrderStatus } from '../api/orders';

// Build a quick inventory summary using current quantities as a % of par
const isInventoryQuery = (text = '') => {
    const lower = text.toLowerCase();
    return lower.includes('inventory') || lower.includes('stock');
};

// Static config for inventory analysis (unit costs, usage, portions, flags)
const INVENTORY_META = {
    'Romaine Lettuce': { type: 'food', unitCost: 1.2, dailyUsage: 12, portionSizeLbs: 0.2, perishable: true, sub: 'Mixed Greens' },
    'Eggs': { type: 'food', unitCost: 2.5, dailyUsage: 10, portionSizeLbs: 0.1, perishable: true },
    'Russet Potatoes': { type: 'food', unitCost: 0.4, dailyUsage: 6 },
    'Chicken Breast': { type: 'food', unitCost: 2.8, dailyUsage: 12, portionSizeLbs: 0.5, perishable: true },
    'Ground Beef': { type: 'food', unitCost: 3.0, dailyUsage: 10, portionSizeLbs: 0.5, perishable: true },
    'Salmon Fillet': { type: 'food', unitCost: 4.2, dailyUsage: 6, portionSizeLbs: 0.5, highValue: true, perishable: true },
    'Wagyu Striploin': { type: 'food', unitCost: 18, dailyUsage: 2, portionSizeLbs: 0.6, highValue: true },
    'Vodka': { type: 'liquor', unitCost: 12, dailyUsage: 1 },
    'Gin': { type: 'liquor', unitCost: 14, dailyUsage: 1 },
    'Tequila': { type: 'liquor', unitCost: 16, dailyUsage: 1 },
};

const buildInventoryAnalysis = (inventory = [], meta = INVENTORY_META) => {
    if (!Array.isArray(inventory) || inventory.length === 0) {
        return null;
    }

    const safeNumber = (val, fallback = 0) => (Number.isFinite(val) ? val : fallback);
    const totals = {
        foodInventoryValue: 0,
        liquorInventoryValue: 0,
        foodCostPercentLastWeek: 0.31,
        liquorCostPercentLastWeek: 0.27,
    };

    const lowStock = [];
    const overstock = [];
    const proteinPortions = [];
    const slowHighValue = [];
    const perishableRisk = [];
    const orderSoon = [];

    inventory.forEach((item) => {
        const cfg = meta[item.item] || {};
        const quantity = safeNumber(item.quantity, 0);
        const unitCost = safeNumber(cfg.unitCost, 1);
        const dailyUsage = safeNumber(cfg.dailyUsage, 1);
        const daysOnHand = dailyUsage > 0 ? quantity / dailyUsage : 0;
        const type = cfg.type || 'food';

        const value = quantity * unitCost;
        if (type === 'liquor') {
            totals.liquorInventoryValue += value;
        } else {
            totals.foodInventoryValue += value;
        }

        if (daysOnHand > 0 && daysOnHand < 2) {
            lowStock.push({ item: item.item, daysOnHand: Number(daysOnHand.toFixed(1)), sub: cfg.sub });
            if (daysOnHand < 1.5) {
                orderSoon.push({ item: item.item, daysOnHand: Number(daysOnHand.toFixed(1)), sub: cfg.sub });
            }
        }
        if (daysOnHand > 7) {
            overstock.push({ item: item.item, daysOnHand: Number(daysOnHand.toFixed(1)) });
        }

        if (cfg.portionSizeLbs && cfg.portionSizeLbs > 0) {
            const portions = Math.floor((item.quantity || 0) / cfg.portionSizeLbs);
            proteinPortions.push({ item: item.item, portions, perishable: !!cfg.perishable });
        }

        if (cfg.highValue && daysOnHand > 6) {
            slowHighValue.push({ item: item.item, daysOnHand: Number(daysOnHand.toFixed(1)) });
        }

        if (cfg.perishable && daysOnHand > 0 && daysOnHand < 3) {
            perishableRisk.push({ item: item.item, daysOnHand: Number(daysOnHand.toFixed(1)) });
        }
    });

    return {
        totals,
        lowStock,
        overstock,
        proteinPortions,
        slowHighValue,
        perishableRisk,
        orderSoon,
    };
};

const buildOccupancyBrief = (orders = [], stats = {}) => {
    const LEGAL_CAPACITY = 100;
    const now = new Date();
    const currentGuests =
        stats.occupancy ??
        orders
            .filter(
                (o) =>
                    o.order_type === 'dine-in' &&
                    ['pending', 'preparing', 'ready'].includes(o.status)
            )
            .reduce((sum, o) => sum + (o.number_of_guests || 0), 0);
    const percent = Math.min(Math.round((currentGuests / LEGAL_CAPACITY) * 100), 150);

    const upcoming = orders
        .filter((o) => o.order_type === 'reservation' && o.reservation_date)
        .map((o) => ({
            guests: o.number_of_guests || 0,
            ts: new Date(o.reservation_date),
        }))
        .filter((r) => r.ts > now && r.ts - now < 3 * 60 * 60 * 1000);

    const blocks = {};
    upcoming.forEach((r) => {
        const hour = r.ts.getHours();
        const blockLabel = `${hour}:00-${hour}:59`;
        blocks[blockLabel] = (blocks[blockLabel] || 0) + r.guests;
    });

    const blockLines = Object.entries(blocks)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, guests]) => `${label}: ${guests} guests`);

    const status =
        percent >= 95
            ? 'capacity risk'
            : percent >= 80
            ? 'approaching peak'
            : 'below capacity';

    const nextPeak =
        blockLines.length > 0
            ? `Next 2-3h forecast: ${blockLines.join('; ')}.`
            : 'No notable reservations in the next 3 hours.';

    const pacing =
        percent < 50
            ? 'Quiet now—take all walk-ins and get ahead on fries, pasta water, and salads.'
            : percent < 85
            ? 'Moderate load—prep ahead (par-cook potatoes, pre-portion chicken) and keep stations hot.'
            : 'Hot window—quote longer times on fried items, keep grill/fry fully stocked, prebuss fast.';

    return `Current load: ~${percent}% (${currentGuests} guests, ${status}). ${nextPeak} ${pacing}`;
};

const buildOrderAnalyticsBrief = (orders = []) => {
    const pending = orders.filter((o) => o.status === 'pending');
    const preparing = orders.filter((o) => o.status === 'preparing');
    const ready = orders.filter((o) => o.status === 'ready');

    const now = new Date();
    const durations = preparing.map((o) => {
        const start = o.preparing_at ? new Date(o.preparing_at) : o.created_at ? new Date(o.created_at) : now;
        return (now - start) / 60000;
    });
    const avgPrep = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
    const late = durations.filter((d) => d > 18);

    const readyAging = ready
        .map((o) => {
            const readyAt = o.ready_at ? new Date(o.ready_at) : now;
            return (now - readyAt) / 60000;
        })
        .filter((m) => m > 5).length;

    const bottleneckHint =
        preparing.length > 10 || pending.length > 8
            ? 'Fry/grill likely heavy—shift a cook or slow fried specials briefly.'
            : 'Line load is manageable—keep standard pacing.';

    const lateLine =
        late.length > 0
            ? `${late.length} tickets over 18 min; pull those to the front and expedite.`
            : 'No tickets over 18 minutes right now.';

    const readyLine =
        readyAging > 0 ? `${readyAging} ready plates aging—run them before they die.` : '';

    return `Tickets: ${pending.length} pending, ${preparing.length} on the rail, ${ready.length} ready. Avg active ticket ~${avgPrep || 'N/A'} min. ${lateLine} ${bottleneckHint} ${readyLine}`.trim();
};

const buildStaffingBrief = (employees = [], orders = [], stats = {}) => {
    const onDuty = employees.filter((e) => e.on_duty);
    const count = onDuty.length;
    const pending = orders.filter((o) => ['pending', 'preparing'].includes(o.status)).length;
    let loadLevel = 'light';
    if (pending > 12) loadLevel = 'heavy';
    else if (pending > 6) loadLevel = 'moderate';

    const guidance =
        loadLevel === 'light'
            ? 'Use the lull for prep: portion chicken, blanch veg, label/rotate.'
            : loadLevel === 'moderate'
            ? 'Keep fry and grill staffed; have expo help plate salads if needed.'
            : 'Shift a body to fry/grill, do not cut dish, and stage sides to reduce ticket times.';

    return `On duty: ${count} line staff. Current ticket load: ${pending} (${loadLevel}). ${guidance}`;
};

const generateLocalResponse = (text, contextData) => {
    const lower = text.toLowerCase();
    if (lower.includes('inventory') || lower.includes('stock')) {
        const analysis = buildInventoryAnalysis(contextData.inventory);
        return formatInventoryAnalysisForChat(analysis);
    }

    if (lower.includes('occupancy') || lower.includes('reservation')) {
        return buildOccupancyBrief(contextData.orders, contextData.stats);
    }

    if (lower.includes('analytics') || lower.includes('ticket') || lower.includes('rail')) {
        return buildOrderAnalyticsBrief(contextData.orders);
    }

    if (lower.includes('staff') || lower.includes('who is working') || lower.includes('on duty')) {
        return buildStaffingBrief(contextData.employees, contextData.orders, contextData.stats);
    }

    if (lower.includes('next order') || lower.includes('what order is next') || lower.includes('up next')) {
        const queue = (contextData.orders || [])
            .filter((o) => ['pending', 'preparing'].includes(o.status))
            .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        if (!queue.length) {
            return 'No pending or preparing orders right now.';
        }
        const next = queue[0];
        const items = (next.items || []).map((i) => i.name || i.item || 'Item').join(', ');
        return `Next up is Order #${next.id || 'n/a'} (status: ${next.status || 'pending'}) for table ${next.table_id || 'N/A'}: ${items || 'no items listed'}.`;
    }

    const orderMatch = lower.match(/order\s*#?\s*(\d+)/);
    if (orderMatch) {
        const id = Number(orderMatch[1]);
        const order = (contextData.orders || []).find((o) => Number(o.id) === id);
        if (order) {
            const items = (order.items || []).map((i) => i.name || i.item || 'Item').join(', ');
            return `Order #${id}: status ${order.status || 'unknown'}, table ${order.table_id || 'N/A'}, items: ${items || 'n/a'}.`;
        }
        return `I don't see Order #${id} in the current context.`;
    }

    return "Here's what I can do right now: ask me about inventory, occupancy, orders, tickets, or staffing and I'll summarize from current data.";
};

const formatInventoryAnalysisForChat = (analysis) => {
    if (!analysis) {
        return "I don't have any inventory data to analyze right now.";
    }

    const list = (arr, max = 4) => arr.slice(0, max);
    const portionsLine = list(
        analysis.proteinPortions.sort((a, b) => (b.perishable ? 1 : 0) - (a.perishable ? 1 : 0)),
        4
    )
        .map((p) => `${p.item} ~${p.portions}`)
        .join(', ');

    const lowLine = list(analysis.lowStock, 4)
        .map((i) => `${i.item} (${i.daysOnHand} days${i.sub ? `; sub ${i.sub}` : ''})`)
        .join(', ');

    const overLine = list(analysis.overstock, 4)
        .map((i) => `${i.item} (${i.daysOnHand} days)`)
        .join(', ');

    const expireLine = list(analysis.perishableRisk, 4)
        .map((i) => `${i.item} (~${i.daysOnHand} days)`)
        .join(', ');

    const orderLine = list(analysis.orderSoon, 4)
        .map((i) => `${i.item} (${i.daysOnHand} days${i.sub ? `; sub ${i.sub}` : ''})`)
        .join(', ');

    const pushLine = list(analysis.slowHighValue, 3)
        .map((i) => `${i.item} (${i.daysOnHand} days)`)
        .join(', ');

    const parts = [];
    if (lowLine || overLine) {
        parts.push(
            `86 risk: ${lowLine || 'none'}. Overstock (run as specials): ${overLine || 'none'}.`
        );
    }

    if (portionsLine) {
        parts.push(`Portions ready: ${portionsLine}.`);
    }

    if (expireLine) {
        parts.push(`Use first (perishable): ${expireLine}.`);
    }

    if (pushLine) {
        parts.push(`Feature/discount to move: ${pushLine}.`);
    }

    if (orderLine) {
        parts.push(`Order sheet: add ${orderLine}.`);
    }

    if (!parts.length) {
        return 'Inventory looks stable. No urgent 86s, specials, or orders right now.';
    }

    return parts.join(' ');
};

const loadSavedChats = () => {
    try {
        const raw = localStorage.getItem('yukonChats');
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.warn('Could not load saved chats', err);
        return [];
    }
};

const introMessage = () => ({
    id: 'yukon-intro',
    sender: 'yukon',
    text: "Hello! I'm Yukon, your kitchen command. Ask me about orders, inventory, occupancy, or staff; I can also execute tasks (start/complete/cancel orders, log/receive inventory) and push alerts on rushes, station bottlenecks, and low stock."
});

const YukonAssistant = ({ contextData = {}, onInventoryLog, onOrderUpdated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([introMessage()]);
    const [savedChats, setSavedChats] = useState(() => loadSavedChats());
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // { type: 'order-status'|'inventory-log', payload }
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    const sendMessage = async (text, options = {}) => {
        if (!text.trim()) return;

        const userMessage = {
            id: Date.now(),
            sender: 'user',
            text: text.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        const normalized = text.trim().toLowerCase();

        // If there's a pending action, interpret simple confirmations
        if (pendingAction) {
            if (/^\s*(yes|yep|confirm|sure|do it|please do it|yeah)\b/.test(normalized)) {
                // Execute the pending action
                setIsTyping(true);
                try {
                    if (pendingAction.type === 'order-status') {
                        const { id, status } = pendingAction.payload;

                        // Check local context first — avoid calling backend when already at target state
                        try {
                            const localOrder = (contextData.orders || []).find(o => String(o.id) === String(id));
                            if (localOrder && String(localOrder.status) === String(status)) {
                                // Make sure parent UI is in sync
                                if (typeof onOrderUpdated === 'function') {
                                    try { onOrderUpdated(localOrder); } catch (e) { console.warn('onOrderUpdated failed', e); }
                                }
                                setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Order #${id} is already ${status}.` }]);
                                setPendingAction(null);
                                setIsTyping(false);
                                return;
                            }
                        } catch (e) {
                            console.warn('Local order check failed', e);
                        }

                        // Attempt backend update
                        try {
                            const resp = await updateOrderStatus(id, status);
                            console.debug('Yukon updateOrderStatus response:', resp);
                            const changed = resp && resp.changed === true;
                            // If parent provided an onOrderUpdated callback, call it with the updated order DTO
                            const updatedOrder = resp && resp.data ? resp.data : resp;
                            console.debug('Yukon updatedOrder (normalized):', updatedOrder, 'changed:', changed);
                            if (typeof onOrderUpdated === 'function' && updatedOrder) {
                                try {
                                    onOrderUpdated(updatedOrder);
                                } catch (e) {
                                    console.warn('onOrderUpdated callback failed', e);
                                }
                            }

                            setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: changed ? `Order #${id} marked ${status}.` : `Order #${id} is already ${status} (no change).` }]);
                        } catch (err) {
                            console.error('Action execution failed', err);

                            // Robustly extract JSON body if present inside err.message
                            let errText = err.message || 'unknown error';
                            try {
                                // Try to find a JSON object substring
                                const jsonMatch = (err.message || '').match(/\{[\s\S]*\}/);
                                if (jsonMatch) {
                                    const parsed = JSON.parse(jsonMatch[0]);
                                    errText = parsed.error || parsed.message || errText;
                                }
                            } catch (_) {
                                // ignore parse errors
                            }

                            // If transition error, refresh order state from backend and sync UI
                            if (errText && /cannot transition/i.test(errText)) {
                                try {
                                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                                    const r = await fetch(`${API_URL}/api/orders/${id}`);
                                    if (r.ok) {
                                        const data = await r.json();
                                        const latestOrder = data?.data || data;
                                        if (typeof onOrderUpdated === 'function' && latestOrder) {
                                            try { onOrderUpdated(latestOrder); } catch (e) { console.warn('onOrderUpdated failed', e); }
                                        }
                                        setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Failed to update order: ${errText}. Refreshed to status '${latestOrder?.status}'.` }]);
                                    } else {
                                        setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Failed to update order: ${errText}.` }]);
                                    }
                                } catch (fetchErr) {
                                    console.error('Failed to refresh order after transition error', fetchErr);
                                    setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Failed to execute action: ${errText}` }]);
                                }
                            } else {
                                setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Failed to execute action: ${errText}` }]);
                            }
                        }
                    } else if (pendingAction.type === 'inventory-log') {
                    } else if (pendingAction.type === 'inventory-log') {
                        const { item, qty } = pendingAction.payload;
                        if (typeof onInventoryLog === 'function') {
                            onInventoryLog(item, qty);
                            setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Logged ${qty} of ${item} to inventory.` }]);
                        } else {
                            setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Logged ${qty} of ${item} (local session only).` }]);
                        }
                    }
                } catch (err) {
                    console.error('Action execution failed', err);
                    // Attempt to extract JSON body from server error message
                    let errText = err.message || 'unknown error';
                    try {
                        const parsed = JSON.parse(err.message);
                        errText = parsed.error || parsed.message || errText;
                    } catch (_) {}
                    setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Failed to execute action: ${errText}` }]);
                } finally {
                    setPendingAction(null);
                    setIsTyping(false);
                }
                return;
            }

            if (/^\s*(no|cancel|abort|stop)\b/.test(normalized)) {
                setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: 'Okay — action cancelled.' }]);
                setPendingAction(null);
                setIsTyping(false);
                return;
            }
            // Otherwise continue to interpret as a normal message
        }

        // Parse immediate action intents (order status changes, inventory logs)
        const orderActionMatch = text.match(/\b(?:order)\s*#?\s*(\d+)\b/i);
        const hasOrderVerb = /\b(start|begin|prepare|mark|set|complete|finish|ready|cancel)\b/i.test(text);
        if (orderActionMatch && hasOrderVerb) {
            const id = Number(orderActionMatch[1]);
            let status = null;
            if (/cancel/i.test(text)) status = 'cancelled';
            else if (/complete|finish/i.test(text)) status = 'completed';
            else if (/ready/i.test(text)) status = 'ready';
            else if (/start|begin|prepare/i.test(text)) status = 'preparing';

            if (status) {
                setPendingAction({ type: 'order-status', payload: { id, status } });
                setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Confirm: set Order #${id} to '${status}'? Reply 'Yes' to confirm.` }]);
                setIsTyping(false);
                return;
            }
        }

        const inventoryMatch = text.match(/\b(?:log|receive|add)\s+(\d+(?:\.\d+)?)\s*(?:cases|case|kg|kgs|kg\.?|kgs\.?|lbs|lb|liters|l|units)?\s*(?:of)?\s+(.+)/i);
        if (inventoryMatch) {
            const qty = parseFloat(inventoryMatch[1]);
            const item = inventoryMatch[2].trim();
            setPendingAction({ type: 'inventory-log', payload: { item, qty } });
            setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'yukon', text: `Confirm: log ${qty} of ${item} into inventory? Reply 'Yes' to confirm.` }]);
            setIsTyping(false);
            return;
        }

        if (options.inventoryAnalysis || options.forceInventorySummary || isInventoryQuery(userMessage.text)) {
            const analysis = buildInventoryAnalysis(contextData.inventory);
            const reply = formatInventoryAnalysisForChat(analysis);
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    sender: 'yukon',
                    text: reply
                }]);
                setIsTyping(false);
            }, 350);
            return;
        }

        if (options.occupancyBrief) {
            const reply = buildOccupancyBrief(contextData.orders, contextData.stats);
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'yukon', text: reply }]);
                setIsTyping(false);
            }, 250);
            return;
        }

        if (options.analyticsBrief) {
            const reply = buildOrderAnalyticsBrief(contextData.orders);
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'yukon', text: reply }]);
                setIsTyping(false);
            }, 250);
            return;
        }

        if (options.staffingBrief) {
            const reply = buildStaffingBrief(contextData.employees, contextData.orders, contextData.stats);
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'yukon', text: reply }]);
                setIsTyping(false);
            }, 250);
            return;
        }

        // Simulate backend delay or fetch real API
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/api/yukon/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage.text,
                    context: contextData
                })
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'yukon',
                text: data.reply || "I'm having trouble connecting to my brain right now."
            }]);

        } catch (error) {
            console.error("Yukon Error:", error);
            const fallback = generateLocalResponse(userMessage.text, contextData);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'yukon',
                text: fallback
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    const handleNewChat = () => {
        setMessages([introMessage()]);
        setInputValue('');
        setIsTyping(false);
        setIsFileMenuOpen(false);
    };

    const handleSaveChat = () => {
        const name = window.prompt('Name this chat');
        if (!name) return;
        const entry = { name, messages };
        const updated = [entry, ...savedChats.filter((c) => c.name !== name)].slice(0, 20);
        setSavedChats(updated);
        try {
            localStorage.setItem('yukonChats', JSON.stringify(updated));
        } catch (err) {
            console.warn('Unable to save chat', err);
        }
        setIsFileMenuOpen(false);
    };

    const handleOpenChat = (name) => {
        const entry = savedChats.find((c) => c.name === name);
        if (!entry) return;
        setMessages(entry.messages || [introMessage()]);
        setIsTyping(false);
        setIsMinimized(false);
        setIsFileMenuOpen(false);
    };

    const handleDeleteChat = (name) => {
        const updated = savedChats.filter((c) => c.name !== name);
        setSavedChats(updated);
        try {
            localStorage.setItem('yukonChats', JSON.stringify(updated));
        } catch (err) {
            console.warn('Unable to delete chat', err);
        }
    };

    // Quick Actions
    const quickActions = [
        { label: 'Inventory', query: 'Check inventory status', icon: '🗃️', type: 'inventory' },
        { label: 'Occupancy', query: 'Occupancy and reservations', icon: '🪑', type: 'occupancy' },
        { label: 'Analytics', query: 'Kitchen order analytics', icon: '📊', type: 'analytics' },
        { label: 'Employees', query: 'Kitchen staffing', icon: '🧑‍🍳', type: 'staffing' },
    ];

    const handleQuickAction = (action) => {
        if (action.type === 'inventory') {
            sendMessage(action.query, { inventoryAnalysis: true });
        } else if (action.type === 'occupancy') {
            sendMessage(action.query, { occupancyBrief: true });
        } else if (action.type === 'analytics') {
            sendMessage(action.query, { analyticsBrief: true });
        } else if (action.type === 'staffing') {
            sendMessage(action.query, { staffingBrief: true });
        } else {
            sendMessage(action.query);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 group hover:scale-105 transition-transform duration-300"
            >
                <div className="relative w-[5rem] h-[5rem]">
                    <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_25px_rgba(227,85,4,0.35)]" />
                    <div className="absolute inset-[4px] rounded-full bg-gradient-to-b from-white/8 to-black/30 opacity-70" />
                    <div className="relative w-full h-full rounded-full overflow-visible p-1">
                        <img
                            src={yukonImage}
                            alt="Yukon AI"
                            className="w-full h-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)] select-none pointer-events-none"
                        />
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className={`fixed z-50 transition-all duration-300 ease-in-out shadow-2xl border border-white/10 overflow-hidden flex flex-col font-sans
      ${isMinimized
                ? 'bottom-6 right-6 w-72 h-14 rounded-2xl bg-dark-card'
                : 'bottom-6 right-6 w-80 md:w-96 h-[500px] max-h-[80vh] rounded-2xl bg-[#1a1a1a]/95 backdrop-blur-xl'
            }`}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 bg-gradient-to-r from-brand-orange/20 to-transparent border-b border-white/5 cursor-pointer"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-3">
                    <div className="relative w-[3.3rem] h-[3.3rem]">
                        <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_18px_rgba(227,85,4,0.35)]" />
                        <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/8 to-black/30 opacity-70" />
                        <div className="relative w-full h-full rounded-full overflow-visible p-0.5">
                            <img
                                src={yukonImage}
                                alt="Yukon"
                                className="w-full h-full object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,0.35)] select-none pointer-events-none"
                            />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Yukon Assistant</h3>
                        <span className="text-green-500 text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setIsFileMenuOpen((prev) => !prev)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 transition"
                        >
                            File ▾
                        </button>
                        {isFileMenuOpen && (
                            <div className="absolute right-0 mt-1 w-52 bg-[#0f0f0f]/95 border border-white/10 rounded-lg shadow-xl backdrop-blur-xl z-10">
                                <button
                                    onClick={handleNewChat}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-100 hover:bg-white/10"
                                >
                                    New chat
                                </button>
                                <button
                                    onClick={handleSaveChat}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-100 hover:bg-white/10"
                                >
                                    Save chat…
                                </button>
                                <div className="border-t border-white/10 my-1" />
                                <div className="px-4 py-1 text-[11px] uppercase tracking-wide text-gray-400">
                                    Open chat
                                </div>
                                <div className="max-h-40 overflow-y-auto">
                                    {savedChats.length === 0 && (
                                        <div className="px-4 py-2 text-xs text-gray-500">No saved chats</div>
                                    )}
                                    {savedChats.map((chat) => (
                                        <div
                                            key={chat.name}
                                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-100 hover:bg-white/10"
                                        >
                                            <button
                                                onClick={() => handleOpenChat(chat.name)}
                                                className="text-left flex-1 truncate"
                                            >
                                                {chat.name}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteChat(chat.name)}
                                                className="ml-2 text-xs text-red-300 hover:text-red-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        className="text-gray-400 hover:text-white p-1"
                    >
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        className="text-gray-400 hover:text-red-400 p-1"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* QUICK ACTION TOOLBAR */}
            {!isMinimized && (
                <div className="flex flex-col border-b border-white/5 bg-black/20">
                    <div className="flex justify-around p-3">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => handleQuickAction(action)}
                                className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-lg hover:scale-110 transition-all shadow-sm group relative"
                                title={action.label}
                            >
                                <span>{action.icon}</span>
                            </button>
                        ))}
                    </div>

                    {/* STATUS INFO STRIP */}
                    <div className="flex items-center justify-around px-2 py-1.5 text-[10px] sm:text-xs bg-white/5 text-gray-400">
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>
                            <span className="font-bold text-gray-200">{contextData.stats?.pending || 0}</span> New
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                            <span className="font-bold text-gray-200">{contextData.stats?.preparing || 0}</span> Prep
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            <span className="font-bold text-gray-200">{contextData.stats?.ready || 0}</span> Ready
                        </div>
                        <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
                            <span className="font-bold text-brand-lime">{contextData.stats?.totalOrders || 0}</span> Active
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Area */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                                ${msg.sender === 'user'
                                            ? 'bg-brand-orange text-white rounded-tr-none'
                                            : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-white/5 bg-black/20">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask Yukon..."
                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-brand-orange/50 focus:bg-white/10 transition-all placeholder:text-gray-500 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isTyping}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default YukonAssistant;
