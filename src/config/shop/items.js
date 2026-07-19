import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'shop_storage.json');

// Initialize empty storage file if it doesn't exist
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify([], null, 4));
}

// Helper functions to read/write JSON
function loadItems() {
    try {
        const data = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading shop items file:', error);
        return [];
    }
}

function saveItems(items) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 4));
        return true;
    } catch (error) {
        console.error('Error writing shop items file:', error);
        return false;
    }
}

// Re-exporting an active getter for shopItems instead of a static array
export const shopItems = {
    get all() { return loadItems(); },
    filter: (cb) => loadItems().filter(cb),
    find: (cb) => loadItems().find(cb)
};

/* ============================
   ADMIN ACTIONS
============================ */

/**
 * Stocks a new item or updates an existing one
 * @param {Object} itemData - The complete item configuration object
 */
export function stockItem(itemData) {
    if (!itemData.id || !itemData.name || typeof itemData.price !== 'number') {
        throw new Error('Invalid item data. Must include unique id, name, and numeric price.');
    }

    const items = loadItems();
    const existingIndex = items.findIndex(item => item.id === itemData.id);

    if (existingIndex !== -1) {
        // Update existing item listing
        items[existingIndex] = { ...items[existingIndex], ...itemData };
    } else {
        // Add new item to the store
        items.push(itemData);
    }

    return saveItems(items);
}

/**
 * Removes an item completely from the shop listings
 * @param {string} itemId - The unique ID of the item to remove
 */
export function removeItem(itemId) {
    const items = loadItems();
    const filteredItems = items.filter(item => item.id !== itemId);
    
    if (items.length === filteredItems.length) {
        return false; // Item wasn't found/nothing removed
    }

    return saveItems(filteredItems);
}

/* ============================
   USER ACTIONS & VALIDATION
============================ */

export function getItemById(itemId) {
    return loadItems().find(item => item.id === itemId);
}

export function getItemsByType(type) {
    return loadItems().filter(item => item.type === type);
}

export function getItemPrice(itemId) {
    const item = getItemById(itemId);
    return item ? item.price : 0;
}

export function validatePurchase(itemId, userData) {
    const item = getItemById(itemId);
    if (!item) {
        return { valid: false, reason: 'Item not found' };
    }

    const inventory = userData.inventory || {};
    const upgrades = userData.upgrades || {};

    if (item.type === 'consumable' && item.maxQuantity) {
        const currentQuantity = inventory[itemId] || 0;
        if (currentQuantity >= item.maxQuantity) {
            return { 
                valid: false, 
                reason: `You can only have a maximum of ${item.maxQuantity} ${item.name}s` 
            };
        }
    }

    if (item.type === 'upgrade' && item.maxLevel) {
        if (upgrades[itemId]) {
            return { 
                valid: false, 
                reason: `You've already purchased ${item.name}` 
            };
        }
    }

    if (item.type === 'tool') {
        const currentQuantity = inventory[itemId] || 0;
        if (itemId !== 'bank_note' && currentQuantity > 0) {
            return { 
                valid: false, 
                reason: `You already have a ${item.name}` 
            };
        }
    }

    if (item.type === 'role' && item.roleId) {
        if (userData.roles?.includes(item.roleId)) {
            return { 
                valid: false, 
                reason: `You already have the ${item.name} role` 
            };
        }
    }

    return { valid: true };
}