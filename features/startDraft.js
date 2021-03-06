const _ = require('lodash');
const Draft = require('../models/Draft');
const { series1 } = require('../utils/boosterPacks');
const { series2 } = require('../utils/series2');
const formatText = require('../utils/formatText');

module.exports = function (controller) {
    controller.on('slash_command', async (bot, message) => {
        global.mixpanel.people.set(message.user_id, { $name: message.user_name });
        if (message.command === '/start_draft') {
            await startDraft(bot, message);
        }
    });

    controller.on('interactive_message', async (bot, message) => {
        if (message.incoming_message.channelData.callback_id === 'startDraftChoice') {
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

    async function startDraft(bot, message) {
        if (message.text === "help") {
            bot.replyPrivate(message, "Start a Clutch draft");
            return;
        }

        const activeDraft = await Draft.findOne({
            isActive: true,
            channel: message.channel
        });

        if (!activeDraft) {
            await bot.replyPrivate(message,
                "No active draft exists in this channel. Run `/setup_draft Draft Name` to start a draft.");
            return;
        }

        const userCount = activeDraft.users.length;
        const packOrder = _.flatten(message.text.split(',').map(pack => pack.trim()).map(pack => _.times(userCount, () => pack)));
        if (!packOrder || !packOrder[0]) {
            activeDraft.packOrder = [..._.times(userCount, () => 's1'), ..._.times(userCount, () => 's1'), ..._.times(userCount, () => 's2')];
        } else {
            activeDraft.packOrder = packOrder;
        }
        await activeDraft.save();

        if (activeDraft) {
            if (!activeDraft.users.length) {
                bot.replyPrivate(message,
                    "No players in the draft! Players must join via `/join_draft` before you can start the draft.");
                return;
            }
            const draftTitle = 'Are you ready to start? Once a draft has started, more players cannot be added.';
            await bot.replyPublic(message, {
                "text": "Start Draft",
                "attachments": [
                    {
                        "fallback": draftTitle,
                        "title": draftTitle,
                        "callback_id": `startDraftChoice`,
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
                "No active draft! You must setup a new draft (`/setup_draft`) and have players join before you can start it.");
        }
    }

    async function openPack(bot, message) {
        const draft = await getDraft(message.channel);
        const packSeries = draft.packOrder[draft.currentPack - 1].toLowerCase();
        let boosterPack;

        if (packSeries === 's1' || packSeries === 'series 1') {
            boosterPack = await series1();
        } else if (packSeries === 's2' || packSeries === 'series 2') {
            boosterPack = await series2();
        } else {
            // Fallback to s1
            boosterPack = await series1();
        }

        draft.availablePlayers = boosterPack;
        await draft.save();
        await renderPack(bot, message);
    }

    async function renderPack(bot, message, preface = '') {
        const draft = await getDraft(message.channel);
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
                "text": `${preface}*${draft.packOrder[draft.currentPack - 1].toUpperCase()} Booster Pack (${draft.currentPack} of ${draft.totalPacks})*`
            }
        };
        const currentPick = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `<@${draft.currentPick}> is currently on the clock.`
            }
        };
        const players = await Promise.all(await draft.availablePlayers.map(await formatCard));

        // New pack has been opened and this is not the first pack.
        if (draft.availablePlayers.length === 15 && draft.currentPack > 1) {
            const cleanIntro = {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*${draft.packOrder[draft.currentPack - 1].toUpperCase()} Booster Pack (${draft.currentPack - 1} of ${draft.totalPacks})*`
                }
            };
            const packInfo = {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: 'All cards in this pack have been selected.'
                }
            }
            await bot.replyPublic(message, {
                blocks: [cleanIntro, packInfo]
            });
            await bot.startConversationInChannel(message.channel, message.user);
            await bot.say({
                blocks: [intro, ...players, currentPick]
            });
        } else {
            bot.replyPublic(message, {
                blocks: [intro, ...players, currentPick]
            });
        }
    }

    async function draftPlayer(bot, message, cardId) {
        const draft = await getDraft(message.channel);

        if (draft.currentPick != message.user) {
            return await bot.replyEphemeral(message, `It is not your turn. <@${draft.currentPick}> is drafting!`);
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
            draftIndex++;
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
                await draft.save();
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
