const axios = require('axios');
const getCardUrl = require('../utils/getCardUrl');

module.exports = function (controller) {
    controller.on('slash_command', async (bot, message) => {
        global.mixpanel.people.set(message.user_id, { $name: message.user_name });
        if (message.command === '/find') {
            await find(bot, message);
        }
    });

    async function find(bot, message) {
        if (message.text === "" || message.text === "help") {
            bot.replyPrivate(message, "Find a player or strategy card.");
            return;
        }

        const name = message.text;

        try {
            const cardUrl = await getCardUrl(name);
            await respondWithCard(bot, message, name, cardUrl);
        } catch (error) {
            await cardNotFound(bot, message, name);
        }
    }

    async function respondWithCard(bot, message, name, cardUrl) {
        const card = {
            attachments: [
                {
                    fallback: name,
                    pretext: name,
                    image_url: cardUrl
                }
            ]
        };
        const fileName = cardUrl.split('/')[cardUrl.split('/').length - 1].split('.png')[0];
        global.mixpanel.track('findCard', {
            ...message,
            fileName,
            success: true,
            distinct_id: message.user_id
        });
        await bot.replyPublic(message, card);
    }

    async function cardNotFound(bot, message, name) {
        global.mixpanel.track('findCard', {
            ...message,
            success: false,
            distinct_id: message.user_id
        });
        await bot.replyPublic(message, `Card with the name "${name}" not found!`);
    }
}