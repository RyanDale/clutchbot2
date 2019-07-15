const mongoose = require('mongoose');
const Card = require('./Card');
const Schema = mongoose.Schema;

const DraftSchema = new Schema({
    isActive: {
        type: Boolean
    },
    name: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        required: true
    },
    users: [
        {
            user_id: {type: String, required: true},
            user_name: {type: String, required: true},
            players: {type: [Card.schema]}
        }
    ],
    created: {
        type: Date,
        default: Date.now,
        required: true
    },
    currentPack: {
        type: Number,
        default: 1
    },
    totalPacks: {
        type: Number,
        default: 1
    },
    currentPick: {
        type: String
    },
    availablePlayers: [Card.schema],
    packOrder: [{ type: String }]
});

module.exports = Draft = mongoose.model('Draft', DraftSchema);