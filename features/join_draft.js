const Draft = require('../models/Draft');

module.exports = function (controller) {
    controller.on('slash_command', async (bot, message) => {
        global.mixpanel.people.set(message.user_id, { $name: message.user_name });
        if (message.command === '/join_draft') {
            await joinDraft(bot, message);
        }
    });

    async function joinDraft(bot, message) {
        if (message.text === "help") {
            bot.replyPrivate(message, "Join a draft");
            return;
        }

        const { user_id, user_name, channel } = message;
        const draft = await Draft.findOne({
            channel,
            isActive: true
        });

        if (!draft) {
            await bot.replyPrivate(message,
                "No active draft exists in this channel. Run `/setup_draft Draft Name` to start a draft.");
            return;
        }

        if (draft.users.find(user => user.user_id === user_id)) {
            bot.replyPrivate(message, `You have already joined the ${draft.name} draft!`);
        } else {
            draft.users.push({
                user_id,
                user_name
            });
            draft.save().then(() => {
                bot.replyPublic(message, `<@${user_id}> has joined the ${draft.name} draft!`);
            });
        }
    }
}