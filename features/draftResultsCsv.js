const Draft = require('../models/Draft');

module.exports = function (controller) {
    controller.on('slash_command', async (bot, message) => {
        global.mixpanel.people.set(message.user_id, { $name: message.user_name });
        if (message.command === '/draft_results_csv') {
            await draftResultsCsv(bot, message);
        }
    });

    async function draftResultsCsv(bot, message) {
        if (message.text === "help") {
            bot.replyPrivate(message, "Show draft results CSV");
            return;
        }

        const { channel } = message;
        const draft = await Draft.findOne({
            channel,
            isActive: true
        });

        if (!draft) {
            await bot.replyPrivate(message,
                "No active draft exists in this channel. Run `/setup_draft Draft Name` to start a draft.");
            return;
        }

        const user = draft.users.find(user => user.user_id === message.user);
        const rendered = renderTeam(user);
        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `\`\`\`${rendered}\`\`\``,
                }
            }
        ]
        await bot.replyPublic(message, { blocks });
    }

    function commaSeparate(c, index) {
        index = index + 1;
        if (c.cardType === 'Batter' || c.cardType === 'Pitcher') {
            return `${index}, ${c.name}, ${c.rarity}, ${c.series}, ${c.position}, ${c.cmdOb.trim()}, ${c.salary}`;
        } else if (c.cardType === 'Strategy') {
            return `${index}, ${c.name}, ${c.rarity}, ${c.series}, ${c.position}`;
        } else if (c.cardType === 'Stadium') {
            return `$${index}, ${c.name}, ${c.rarity}, ${c.series}`;
        }
    }

    function renderTeam(user) {
        const headers = ['#', 'Name', 'Rarity', 'Series', 'Position', 'CMD/OBP', 'Salary'].join(', ');
        const players = user.players.map((player, index) => commaSeparate(player, index)).join(',\n');
        return `${headers},\n${players}`;
    }
}
