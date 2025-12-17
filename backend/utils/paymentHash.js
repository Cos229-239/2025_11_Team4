const crypto = require('crypto');

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const rawId = item?.menu_item_id ?? item?.id ?? item?.menuItemId;
      const rawQty = item?.quantity;
      const id = Number(rawId);
      const quantity = Number(rawQty);
      if (!Number.isFinite(id) || !Number.isFinite(quantity)) return null;
      return { id, quantity };
    })
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);
}

function computeItemsHash(items) {
  const normalized = normalizeItems(items);
  const material = normalized.map((i) => `${i.id}:${i.quantity}`).join('|');
  return crypto.createHash('sha256').update(material).digest('hex');
}

function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

module.exports = {
  computeItemsHash,
  normalizeItems,
  toCents,
};

