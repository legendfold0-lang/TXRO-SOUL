import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { shopItems, validatePurchase, getCurrentPrice, getCategoryForItem } from './index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Interact with the server economy items marketplace')
        .addStringOption(opt => 
            opt.setName('buy')
               .setDescription('Optional: Enter an item ID to purchase it directly')
               .setRequired(false)
        )
        .addIntegerOption(opt => 
            opt.setName('quantity')
               .setDescription('Number of units to buy if purchasing an item (Default: 1)')
               .setMinValue(1)
               .setRequired(false)
        ),

    async execute(interaction) {
        const buyItemId = interaction.options.getString('buy');
        const quantity = interaction.options.getInteger('quantity') || 1;
        const currentItemsList = shopItems.all;

        /* ==========================================
           PATH A: USER IS BUYING AN ITEM
           ========================================== */
        if (buyItemId) {
            const targetId = buyItemId.toLowerCase().trim();
            const item = shopItems.find(i => i.id === targetId);
            
            if (!item) {
                return interaction.reply({ 
                    content: `❌ Product ID \`${targetId}\` does not exist in our active listings.`, 
                    ephemeral: true 
                });
            }

            // Replace mockUserObject with your system's dynamic database fetching logic
            const mockUserBalance = 500000; 
            const mockUserObject = { inventory: {}, upgrades: {}, roles: [] }; 

            const checks = validatePurchase(targetId, mockUserObject);
            if (!checks.valid) {
                return interaction.reply({ content: `❌ Transaction Blocked: ${checks.reason}`, ephemeral: true });
            }

            const finalPrice = getCurrentPrice(targetId, { quantity, userData: mockUserObject });
            if (mockUserBalance < finalPrice) {
                return interaction.reply({ 
                    content: `❌ Insufficient Funds! You need 🪙 ${finalPrice.toLocaleString()} to purchase ${quantity}x **${item.name}**.`, 
                    ephemeral: true 
                });
            }

            // --- DEPLOY USER SAVING DB ACTIONS HERE ---

            return interaction.reply({ 
                content: `🎉 **Purchase Confirmed!** You bought **${quantity}x ${item.name}** for a total of 🪙 \`${finalPrice.toLocaleString()}\`!`, 
                ephemeral: false 
            });
        }

        /* ==========================================
           PATH B: USER IS BROWSING THE CATALOG
           ========================================== */
        if (currentItemsList.length === 0) {
            return interaction.reply({ 
                content: '🛒 **The store is currently out of stock.** Check back later once an administrator lists items!', 
                ephemeral: false 
            });
        }

        const shopEmbed = new EmbedBuilder()
            .setTitle('✨ Server Marketplace')
            .setDescription('To buy an item, use `/shop buy: [id]`')
            .setColor('#5865F2')
            .setTimestamp();

        // Group listings by category
        const categoryGroups = {};
        currentItemsList.forEach(item => {
            const cat = getCategoryForItem(item.type);
            if (!categoryGroups[cat.name]) categoryGroups[cat.name] = { icon: cat.icon, items: [] };
            categoryGroups[cat.name].items.push(item);
        });

        for (const [catName, data] of Object.entries(categoryGroups)) {
            let textBlock = '';
            data.items.forEach(i => {
                textBlock += `• \`${i.id}\` **${i.name}** — 🪙 ${i.price.toLocaleString()}\n*${i.description}*\n\n`;
            });
            shopEmbed.addFields({ name: `${data.icon} ${catName}`, value: textBlock || 'No listings available.' });
        }

        return interaction.reply({ embeds: [shopEmbed] });
    }
};