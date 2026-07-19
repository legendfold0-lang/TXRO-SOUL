import { 
    shopItems, 
    getItemById, 
    getItemsByType, 
    getItemPrice, 
    validatePurchase,
    stockItem,
    removeItem 
} from './items.js';
import { botConfig } from '../bot.js';

const { currency } = botConfig.economy;

export const shopConfig = {
    name: 'TitanBot Shop',
    currency: currency.name,
    currencySymbol: currency.symbol || '🪙',
    
    categories: [
        { id: 'consumables', name: 'Consumables', description: 'One-time items that provide speed boosts or luck buffs', icon: '🍯', itemTypes: ['consumable'] },
        { id: 'upgrades', name: 'Upgrades', description: 'Permanent stat changes modifying global max capacity limits', icon: '⚡', itemTypes: ['upgrade'] },
        { id: 'tools', name: 'Tools', description: 'Active items used to run mining and gathering actions', icon: '⛏️', itemTypes: ['tool'] },
        { id: 'roles', name: 'Roles', description: 'Cosmetic server integrations complete with custom permissions', icon: '🎭', itemTypes: ['role'] }
    ],
    
    transaction: {
        cooldown: 1000,
        maxQuantity: 10,
        confirmTimeout: 30000
    },
    
    events: {
        sales: { enabled: true, schedule: [{ day: 0, discount: 0.2, message: '🔥 **Weekend Sale!** 20% off!' }] }
    }
};

export {
    shopItems,
    getItemById,
    getItemsByType,
    getItemPrice,
    validatePurchase,
    stockItem,
    removeItem
};

export function getCurrentPrice(itemId, { quantity = 1, userData = null } = {}) {
    const basePrice = getItemPrice(itemId) * quantity;
    let discount = 0;
    
    const now = new Date();
    if (shopConfig.events.sales.enabled) {
        const today = now.getDay();
        const sale = shopConfig.events.sales.schedule.find(s => s.day === today);
        if (sale) discount += sale.discount;
    }
    
    if (userData) {
        if (userData.roles?.includes('premium')) discount += 0.1;
        if (quantity >= 10) discount += 0.1;
    }
    
    discount = Math.max(0, Math.min(1, discount));
    return Math.floor(basePrice * (1 - discount));
}

export function getCategoryForItem(itemType) {
    return shopConfig.categories.find(cat => cat.itemTypes.includes(itemType)) || {
        id: 'other', name: 'Other', description: 'Miscellaneous listings', icon: '📦'
    };
}

export function getItemsInCategory(categoryId) {
    const category = shopConfig.categories.find(cat => cat.id === categoryId);
    if (!category) return [];
    
    return shopItems.filter(item => category.itemTypes.includes(item.type));
}