import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'shop_storage.json');

// Safely initialize the storage file if it doesn't exist
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify([], null, 4));
}

function loadItems() {
    try {
        const data = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Shop Database Error [Read]:', error);
        return [];
    }
}

function saveItems(items) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 4));
        return true;
    } catch (error) {
        console.error('❌ Shop Database Error [Write]:', error);
        return false;
    }
}

// Global active store getter wrapper
export const shopItems = {
    get all() { return loadItems(); },
    filter: (cb) => loadItems().filter(cb),
    find: (cb) => loadItems().find(cb)
};

/* ========================================================================
   ADMIN FUNCTIONALITIES
======================================================================== */

/**
 * Stocks a new item or updates an existing metadata block
 * @param {Object} itemData - Structural configuration block
 */
export function stockItem(itemData) {
    if (!itemData.id || !itemData.name || typeof itemData.price !== 'number') {
        throw new Error('Invalid item data. Must include unique id, name, and numeric price.');
    }

    const items = loadItems();
    const existingIndex = items.findIndex(item => item.id === itemData.id);

    if (existingIndex !== -1) {
        // Overwrite existing configuration listing
        items[existingIndex] = { ...items[existingIndex], ...itemData };
    } else {
        // Push fresh entry
        items.push(itemData);
    }

    return saveItems(items);
}

/**
 * Erases a physical configuration completely from shop catalogs
 * @param {string} itemId - Target tracking tracking string
 */
export function removeItem(itemId) {
    const items = loadItems();
    const filteredItems = items.filter(item => item.id !== itemId);
    
    if (items.length === filteredItems.length) {
        return false; // Target ID mismatch / nothing removed
    }

    return saveItems(filteredItems);
}

/* ========================================================================
   UTILITIES & USER LOOKUPS
======================================================================== */

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
            return { valid: false, reason: `You can only hold a maximum of ${item.maxQuantity} ${item.name}s` };
        }
    }

    if (item.type === 'upgrade') {
        if (upgrades[itemId]) {
            return { valid: false, reason: `You have already maximized the permanent upgrade: ${item.name}` };
        }
    }

    if (item.type === 'tool') {
        const currentQuantity = inventory[itemId] || 0;
        if (itemId !== 'bank_note' && currentQuantity > 0) {
            return { valid: false, reason: `You already own a ${item.name}` };
        }
    }

    if (item.type === 'role' && item.roleId) {
        if (userData.roles?.includes(item.roleId)) {
            return { valid: false, reason: `You already hold the ${item.name} custom server tier.` };
        }
    }

    return { valid: true };
}