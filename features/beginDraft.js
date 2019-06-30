const Draft = require('../models/Draft');
const { series1 } = require('../utils/boosterPacks');
const getCardUrl = require('../utils/getCardUrl');

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
                const activeDraft = await getDraft(message.channel);
                activeDraft.totalPacks = activeDraft.users.length * 3;
                activeDraft.save();
                await openPack(bot, message);
            }
        }
    });

    controller.on('block_actions', async (bot, message) => {
        const action = message.incoming_message.channelData.actions[0];

        // This occurs when a card was selected
        if (action.action_id === 'draftPlayer') {
            const cardId = action.value.split('card/')[1];
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

    async function openPack(bot, message) {
        const draft = await getDraft(message.channel);
        const boosterPack = await series1();
        const formatText = (c, index) => {
            const space = () => `${index + 1}.${index + 1 < 10 ? '  ' : ''}`;
            const cardLink = `<${getCardUrl(c.name)}|${c.name}>`;
            if (c.cardType === 'Batter' || c.cardType === 'Pitcher') {
                return `${space()} [*${c.rarity}*] ${cardLink} - ${c.position} - ${c.cmdOb.trim()} - $${c.salary}`;
            } else if (c.cardType === 'Strategy') {
                return `${space()} [*${c.rarity}*] ${cardLink} - ${c.position}`;
            } else if (c.cardType === 'Stadium') {
                return `${space()} [*${c.rarity}*] ${cardLink}`;
            }
        };

        const formatCard = (card, index) => {
            if (card.picked) {
                return {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `~${formatText(card, index)}~`
                    }
                };
            } else {
                return {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": formatText(card, index)
                    },
                    "accessory": {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "emoji": true,
                            "text": `Pick ${card.name}`
                        },
                        "value": `card/${card._id}`,
                        action_id: 'draftPlayer'
                    }
                };
            }
        };

        if (!draft.currentPick) {
            draft.currentPick = draft.users[0].user_id;
            draft.save();
        }

        const intro = {
            "type": "section",
            "text": {
                "type": "plain_text",
                "emoji": true,
                "text": `Booster Pack (${draft.currentPack} of ${draft.totalPacks})`
            }
        };
        const currentPick = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `<@${draft.currentPick}> is currently on the clock.`
            }
        };
        await bot.replyPublic(message, {
            blocks: [intro, ...boosterPack.map(formatCard), currentPick]
        });
    }

    async function getDraft(channel) {
        return await Draft.findOne({
            isActive: true,
            channel: channel
        });
    }
}
