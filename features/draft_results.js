const Draft = require('../models/Draft');
const formatText = require('../utils/formatText');

module.exports = function (controller) {
    controller.on('slash_command', async (bot, message) => {
        global.mixpanel.people.set(message.user_id, { $name: message.user_name });
        if (message.command === '/draft_results') {
            await draftResults(bot, message);
        }
    });

    async function draftResults(bot, message) {
        if (message.text === "help") {
            bot.replyPrivate(message, "Show draft results");
            return;
        }

        const { channel } = message;
        const draft = await Draft.findOne({
            channel,
            isActive: true
        });

        if (!draft) {
            await bot.replyPrivate(message,
                "No active draft exists in this channel. Run `/create_draft Draft Name` to start a draft.");
            return;
        }

        const rend = await Promise.all(draft.users
            .filter(user => user.user_id === message.user)
            .map(async user => ({
                players: await renderTeam(user),
                user: user.user_id
            })));

        const blocks = rend.map(user => {
            const heading = {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `<@${user.user}> Draft Picks`
                }
            };
            return [heading, ...user.players.map(player => ({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: player
                }
            }))];
        })[0];
        await bot.replyPublic(message, { blocks });
    }

    async function renderTeam(user) {
        return await Promise.all(user.players.map(async (player, index) => await formatText(player, index)));
    }
}
