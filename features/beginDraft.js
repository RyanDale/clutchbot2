const Draft = require('../models/Draft');

module.exports = function (controller) {
    controller.on('slash_command', async (bot, message) => {
        global.mixpanel.people.set(message.user_id, { $name: message.user_name });
        if (message.command === '/begin_draft') {
            await beginDraft(bot, message);
        }
    });

    controller.on('interactive_message', async (bot, message) => {
        if (message.incoming_message.channelData.callback_id === 'beginDraftChoice') {
            if (message.actions[0].name === 'Yes') {
                console.log('Let\'s open a pack!');
            }
        }
    });

    async function beginDraft(bot, message) {
        if (message.text === "help") {
            bot.replyPrivate(message, "Begin a Clutch draft");
            return;
        }

        const activeDraft = await Draft.findOne({
            isActive: true,
            channel: message.channel
        }).select("users").lean();

        if (activeDraft) {
            if (!activeDraft.users.length) {
                bot.replyPrivate(message,
                    "No players in the draft! Players must join via `/join_draft` before you can begin the draft.");
                return;
            }
            const draftTitle = 'Are you ready to begin? Once a draft has started, more players cannot be added.';
            await bot.replyPrivate(message, {
                "text": "Begin Draft",
                "attachments": [
                    {
                        "fallback": draftTitle,
                        "title": draftTitle,
                        "callback_id": `beginDraftChoice`,
                        "color": "#3AA3E3",
                        "attachment_type": "default",
                        "actions": [
                            {
                                "name": "Yes",
                                "text": "Yes",
                                "type": "button",
                                "value": "Yes"
                            },
                            {
                                "name": "No",
                                "text": "No",
                                "type": "button",
                                "value": "No"
                            }
                        ]
                    }
                ]
            });
        } else {
            bot.replyPrivate(message,
                "No active draft! You must create a new draft (`/create_draft`) and have players join before you can begin it.");
        }
    }
}
