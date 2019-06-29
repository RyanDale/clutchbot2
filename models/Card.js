const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CardSchema = new Schema({
    cardNumber: {
        type: String,
        required: true
    },
    series: {
        type: String,
        required: true,
        enum: ['Series 1', 'Series 2']
    },
    cardType: {
        type: String,
        required: true,
        enum: ['Batter', 'Pitcher', 'Strategy', 'Stadium']
    },
    name: {
        type: String,
        required: true
    },
    rarity: {
        type: String,
        required: true,
        enum: ['C', 'U', 'R', 'UR']
    },
    year: {
        type: String,
        required: true,
        enum: ['2017', '2018', '2019']
    },
    position: {
        type: String,
        required: true
    },
    salary: {
        type: Number
    },
    cmdOb: {
        type: String
    },
    created: {
        type: Date,
        default: Date.now,
        required: true
    }
});

module.exports = Card = mongoose.model('Card', CardSchema);
