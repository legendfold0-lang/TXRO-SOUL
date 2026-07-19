import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { shopItems, stockItem, removeItem, validatePurchase, getCurrentPrice, getCategoryForItem } from './index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Interact with the server economy items department')
        
        // Subcommand: View items catalog
        .addSubcommand(sub => 
            sub.setName('view')
               .setDescription('Browse all loaded items stocked inside the bot catalog')
        )
        
        // Subcommand: Buy an item
        .addSubcommand(sub => 
            sub.setName('buy')
               .setDescription('Purchase an item from the marketplace')
               .addStringOption(opt => opt.setName('id').setDescription('The unique alphanumeric item ID').setRequired(true))
               .addIntegerOption(opt => opt.setName('quantity').setDescription('Number of units to buy (Default: 1)').setMinValue(1))
        )
        
        // Subcommand: Admin Stock
        .addSubcommand(sub => 
            sub.setName('stock')
               .setDescription('[Admin Only] Inject a new physical listing structure into database lines')
               .addStringOption(opt => opt.setName('id').setDescription('Unique string ID (e.g. iron_sword)').setRequired(true))
               .addStringOption(opt => opt.setName('name').setDescription('Public visible listing title').setRequired(true))
               .addIntegerOption(opt => opt.setName('price').setDescription('Base economic purchasing value').setRequired(true))
               .addStringOption(opt => opt.setName('description').setDescription('Detail summary text blocks').setRequired(true))
               .addStringOption(opt => 
                    opt.setName('type').setDescription('Item categorization context').setRequired(true)
                       .addChoices(
                           { name: 'Consumable', value: 'consumable' },
                           { name: 'Upgrade', value: 'upgrade' },
                           { name: 'Tool', value: 'tool' },
                           { name: 'Role', value: 'role' }
                       )
               )
               .addIntegerOption(opt => opt.setName('max_stock').setDescription('Upper limits checking constraints'))
        )
        
        // Subcommand: Admin Remove
        .addSubcommand(sub => 
            sub.setName('remove')
               .setDescription('[Admin Only] Erase an existing configuration structure from the inventory')
               .addStringOption(opt => opt.setName('id').setDescription('Target ID configuration tag to clear').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const isAdminAction = ['stock', 'remove'].includes(subcommand);

        // Security check for Admin actions
        if (isAdminAction && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Access Denied: Administrator flags needed.', ephemeral: true });
        }

        const currentItemsList = shopItems.all;

        /* ==========================================
           HANDLER: VIEW MARKETPLACE
           ========================================== */
        if (subcommand === 'view') {
            if (currentItemsList.length === 0) {
                return interaction.reply({ content: '🛒 **The store is currently out of stock.** Check back later once an administrator lists items!', ephemeral: false });
            }

            const shopEmbed = new EmbedBuilder()
                .setTitle('✨ Server Marketplace')
                .setDescription('Use `/shop buy [id]` to acquire items.')
                .setColor('#5865F2')
                .setTimestamp();

            // Group existing listings nicely by their active categories
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

        /* ==========================================
           HANDLER: BUY TRANSACTION
           ========================================== */
        if (subcommand === 'buy') {
            const id = interaction.options.getString('id');
            const qty = interaction.options.getInteger('quantity') || 1;
            
            // Hypothetical database mapping profile query load (replace with your dynamic ORM/MongoDB query hooks)
            const mockUserBalance = 500000; 
            const mockUserObject = { inventory: {}, upgrades: {}, roles: [] }; 

            const item = shopItems.find(i => i.id === id);
            if (!item) return interaction.reply({ content: `❌ Product ID \`${id}\` does not exist in our active listings catalogs.`, ephemeral: true });

            const checks = validatePurchase(id, mockUserObject);
            if (!checks.valid) return interaction.reply({ content: `❌ Transaction Blocked: ${checks.reason}`, ephemeral: true });

            const finalPrice = getCurrentPrice(id, { quantity: qty, userData: mockUserObject });
            if (mockUserBalance < finalPrice) {
                return interaction.reply({ content: `❌ Insufficient Funds! You need 🪙 ${finalPrice.toLocaleString()} to purchase ${qty}x **${item.name}**.`, ephemeral: true });
            }

            // --- DEPLOY USER SAVING DB ACTIONS HERE ---
            // Deduct finalPrice from user balance
            // Add qty pieces to user object structure 

            return interaction.reply({ content: `🎉 **Purchase Confirmed!** You bought **${qty}x ${item.name}** for a total of 🪙 \`${finalPrice.toLocaleString()}\`!`, ephemeral: false });
        }

        /* ==========================================
           HANDLER: ADMIN STOCK/CREATE
           ========================================== */
        if (subcommand === 'stock') {
            const itemPayload = {
                id: interaction.options.getString('id').toLowerCase().trim(),
                name: interaction.options.getString('name'),
                price: interaction.options.getInteger('price'),
                description: interaction.options.getString('description'),
                type: interaction.options.getString('type'),
                maxQuantity: interaction.options.getInteger('max_stock') || null
            };

            stockItem(itemPayload);
            return interaction.reply({ content: `✅ **Data Sync Success:** Successfully updated product listing configuration data for \`${itemPayload.id}\` (**${itemPayload.name}**).`, ephemeral: true });
        }

        /* ==========================================
           HANDLER: ADMIN REMOVE
           ========================================== */
        if (subcommand === 'remove') {
            const targetId = interaction.options.getString('id').toLowerCase().trim();
            const wasRemoved = removeItem(targetId);

            if (wasRemoved) {
                return interaction.reply({ content: `🗑️ **Product Erased:** Item file tracking data for ID \`${targetId}\` has been dropped out of storage mappings.`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ **Error:** No active shop product configuration file found under matching target tracking string: \`${targetId}\`.`, ephemeral: true });
            }
        }
    }
};