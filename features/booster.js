const { series1 } = require('../utils/boosterPacks');
const getCardUrl = require('../utils/getCardUrl');

module.exports = function (controller) {
    controller.on('slash_command', async (bot, message) => {
        global.mixpanel.people.set(message.user_id, { $name: message.user_name });
        if (message.command === '/booster') {
            await booster(bot, message);
        }
    });

    async function booster(bot, message) {
        if (message.text === "help") {
            bot.replyPrivate(message, "Generate a random booster pack.");
            return;
        }

        const series = message.text;
        let boosterPack;

        switch (series) {
            case 'Series 2':
                // TODO: Implement Series 2 logic once available
                boosterPack = [];
                break;
            default:
                boosterPack = await series1();
        }

        const formatCard = async (c, index) => {
            const space = () => `${index + 1}.${index + 1 < 10 ? '  ' : ''}`;
            const cardUrl = await getCardUrl(c.name);
            const cardLink = `<${cardUrl}|${c.name}>`;
            if (c.cardType === 'Batter' || c.cardType === 'Pitcher') {
                return `${space()} [*${c.rarity}*] ${cardLink} - ${c.position} - ${c.cmdOb.trim()} - $${c.salary}`;
            } else if (c.cardType === 'Strategy') {
                return `${space()} [*${c.rarity}*] ${cardLink} - ${c.position}`;
            } else if (c.cardType === 'Stadium') {
                return `${space()} [*${c.rarity}*] ${cardLink}`;
            }
        };

        const boosterCards = Promise.all(await boosterPack.map(await formatCard));
        bot.replyPublic(message, 'Booster Pack:\n' + boosterCards.join('\n'));
    }
}