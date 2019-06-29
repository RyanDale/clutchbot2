const mongoose = require('mongoose');
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
            user_name: {type: String, required: true}
        }
    ],
    created: {
        type: Date,
        default: Date.now,
        required: true
    }
});

module.exports = Draft = mongoose.model('Draft', DraftSchema);