const { series1 } = require('../utils/boosterPacks');
const { series2 } = require('../utils/series2');
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

        const series = message.text.toLowerCase();
        let boosterPack;
        let boosterLabel;

        switch (series) {
            case 's2':
                boosterPack = await series2();
                boosterLabel = '2019 Series 2 Booster Pack';
                break;
            default:
                boosterPack = await series1();
                boosterLabel = '2019 Series 1 Booster Pack';
        }

        const formatCard = async (c, index) => {
            const space = () => `${index + 1}.${index + 1 < 10 ? '  ' : ''}`;
            let cardUrl;
            try {
                cardUrl = await getCardUrl(c.name, c.limitedEdition);
            } catch {}

            const cardLink = cardUrl ? `<${cardUrl}|${c.name}>` : c.name;
            if (c.cardType === 'Batter' || c.cardType === 'Pitcher') {
                return `${space()} [*${c.rarity}*] ${cardLink} - ${c.position} - ${c.cmdOb.trim()} - $${c.salary}`;
            } else if (c.cardType === 'Strategy') {
                return `${space()} [*${c.rarity}*] ${cardLink} - ${c.position}`;
            } else if (c.cardType === 'Stadium') {
                return `${space()} [*${c.rarity}*] ${cardLink}`;
            }
        };

        const boosterCards = await Promise.all(await boosterPack.map(await formatCard));
        bot.replyPublic(message, `*${boosterLabel}*\n${boosterCards.join('\n')}`);
    }
}