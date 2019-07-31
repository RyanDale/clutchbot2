const Draft = require('../models/Draft');

module.exports = function (controller) {
    controller.on('slash_command', async (bot, message) => {
        global.mixpanel.people.set(message.user_id, { $name: message.user_name });
        if (message.command === '/setup_draft') {
            await setupDraft(bot, message);
        }
    });

    controller.on('interactive_message', async (bot, message) => {
        if (message.incoming_message.channelData.callback_id === 'setupDraftChoice') {
            if (message.actions[0].name === 'Setup Draft') {
                await Draft.findOneAndUpdate({
                    isActive: true,
                    channel: message.channel
                }, { isActive: false });
                await saveDraft(bot, message, message.actions[0].value, message.channel)
            }
        }

    });

    async function setupDraft(bot, message) {
        if (message.text === "help") {
            bot.replyPrivate(message, "Start a Clutch draft");
            return;
        }

        if (message.text === "") {
            return await bot.replyPrivate(message,
                'A name is required when creating a draft. Run `/setup_draft Draft_Name_Here`.');
        }

        const activeDraft = await Draft.findOne({
            isActive: true,
            channel: message.channel
        }).select("name").lean();

        if (activeDraft) {
            const draftTitle = `Would you like to setup a new draft and archive "${activeDraft.name}"?`;
            await bot.replyPrivate(message, {
                "text": "Active draft already exists",
                "attachments": [
                    {
                        "fallback": draftTitle,
                        "title": draftTitle,
                        "callback_id": `setupDraftChoice`,
                        "color": "#3AA3E3",
                        "attachment_type": "default",
                        "actions": [
                            {
                                "name": "Setup Draft",
                                "text": "Setup Draft",
                                "type": "button",
                                "value": `${message.text}`
                            },
                            {
                                "name": "no",
                                "text": "No",
                                "type": "button",
                                "value": "no"
                            }
                        ]
                    }
                ]
            });
        } else {
            await saveDraft(bot, message, message.text, message.channel);
        }
    }

    async function saveDraft(bot, message, name, channel) {
        const draft = new Draft({
            name,
            isActive: true,
            channel
        });

        await draft.save().then(draft =>
            bot.replyPublic(message, `Draft Setup: ${draft.name}. Type \`/join_draft\` to enter the draft.`));
    }
}
