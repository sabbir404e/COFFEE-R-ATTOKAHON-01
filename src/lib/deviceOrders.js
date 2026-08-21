/**
 * Helper to manage device-based order history stored in localStorage with 24-hour (1 day) expiration.
 * Ensures orders placed on this device are private to this device and automatically expire after 1 day.
 */

const DEVICE_ORDERS_KEY = 'ca_device_orders';
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Retrieves valid (non-expired) device orders from localStorage.
 * Automatically cleans up any entries older than 24 hours.
 * @returns {Array<{ id: number, timestamp: number }>}
 */
export function getDeviceOrderEntries() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEVICE_ORDERS_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    const now = Date.now();
    // Filter out expired orders older than 24 hours
    const valid = list.filter((item) => {
      const ts = item.timestamp || item.createdAt || item.time;
      return ts && now - Number(ts) < ONE_DAY_MS;
    });

    // Check if legacy ca_last_order_id exists and incorporate if not present
    const lastId = localStorage.getItem('ca_last_order_id');
    if (lastId) {
      const numId = Number(lastId);
      if (!Number.isNaN(numId) && numId > 0 && !valid.some((x) => Number(x.id) === numId)) {
        valid.unshift({ id: numId, timestamp: now });
      }
    }

    // If any expired entries were purged or legacy ID was added, update localStorage
    if (valid.length !== list.length) {
      localStorage.setItem(DEVICE_ORDERS_KEY, JSON.stringify(valid));
    }

    return valid;
  } catch (e) {
    return [];
  }
}

/**
 * Returns an array of order IDs stored on this device within the last 24 hours.
 * @returns {number[]}
 */
export function getDeviceOrderIds() {
  const entries = getDeviceOrderEntries();
  return entries.map((item) => Number(item.id)).filter((id) => !Number.isNaN(id) && id > 0);
}

/**
 * Saves or updates an order ID on this device with a fresh timestamp.
 * @param {number|string} orderId 
 * @param {number} [timestamp] 
 */
export function saveDeviceOrder(orderId, timestamp = Date.now()) {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const numId = Number(orderId);
    if (Number.isNaN(numId) || numId <= 0) return;

    const entries = getDeviceOrderEntries();
    // Remove if already in list so it gets added with the latest timestamp at the beginning
    const filtered = entries.filter((x) => Number(x.id) !== numId);
    filtered.unshift({ id: numId, timestamp });

    const now = Date.now();
    const valid = filtered.filter((item) => now - Number(item.timestamp) < ONE_DAY_MS);

    localStorage.setItem(DEVICE_ORDERS_KEY, JSON.stringify(valid));
    localStorage.setItem('ca_last_order_id', String(numId));
  } catch (e) {}
}

/**
 * Removes a specific order from device history.
 * @param {number|string} orderId 
 */
export function removeDeviceOrder(orderId) {
  if (typeof window === 'undefined') return;
  try {
    const numId = Number(orderId);
    const entries = getDeviceOrderEntries();
    const filtered = entries.filter((x) => Number(x.id) !== numId);
    localStorage.setItem(DEVICE_ORDERS_KEY, JSON.stringify(filtered));

    if (localStorage.getItem('ca_last_order_id') === String(numId)) {
      if (filtered.length > 0) {
        localStorage.setItem('ca_last_order_id', String(filtered[0].id));
      } else {
        localStorage.removeItem('ca_last_order_id');
      }
    }
  } catch (e) {}
}
