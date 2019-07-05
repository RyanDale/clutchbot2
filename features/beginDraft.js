const _ = require('lodash');
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
            await draftPlayer(bot, message, cardId);
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
            await bot.replyPublic(message, {
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

        draft.availablePlayers = boosterPack;
        await draft.save();
        await renderPack(bot, message);
    }

    async function renderPack(bot, message, preface = '') {
        const draft = await getDraft(message.channel);

        const formatText = async (c, index) => {
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

        const formatCard = async (card, index) => {
            const formattedText = await formatText(card, index);
            if (card.picked) {
                return {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `~${formattedText}~`
                    }
                };
            } else {
                return {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": formattedText
                    },
                    "accessory": {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "emoji": true,
                            "text": `Pick`
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
                "type": "mrkdwn",
                "text": `${preface}Booster Pack (${draft.currentPack} of ${draft.totalPacks})`
            }
        };
        const currentPick = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `<@${draft.currentPick}> is currently on the clock.`
            }
        };
        const players = await Promise.all(await draft.availablePlayers.map(await formatCard))
        await bot.replyPublic(message, {
            blocks: [intro, ...players, currentPick]
        });
    }

    async function draftPlayer(bot, message, cardId) {
        const draft = await getDraft(message.channel);
        
        if (draft.currentPick != message.user) {
            return await bot.replyPublic(message, `It is not your turn. <@${draft.currentPick}> is drafting!`);
        }
        
        const drafted = draft.availablePlayers.find(card => card._id == cardId);
        let draftIndex;
        draft.users.forEach((user, index) => {
            if (user.user_id === message.user) {
                user.players = [...user.players, drafted];
                draftIndex = index;
            }
        });
        if (draftIndex + 1 >= draft.users.length) {
            draftIndex = 0;
        } else {
            draftIndex ++;
        }
        draft.currentPick = draft.users[draftIndex].user_id;
        draft.availablePlayers = draft.availablePlayers.filter(card => card._id != cardId);

        // Continue with the draft as long as there are players in the pack
        if (draft.availablePlayers.length) {
            await draft.save();
            renderPack(bot, message, `<@${message.user}> selected ${drafted.name}.\n\n`);
        } else {
            // We have more packs to open
            if (draft.currentPack < draft.totalPacks) {
                draft.currentPack += 1;
                await draft.save();
                openPack(bot, message);
            } else {
                bot.replyPublic(message,
                    `<@${message.user}> selected ${drafted.name}.\n\nThe draft is complete! Run \`/draft_results\` to see all selections.`);
            }
            
        }
    }

    async function getDraft(channel) {
        return await Draft.findOne({
            isActive: true,
            channel: channel
        });
    }
}
