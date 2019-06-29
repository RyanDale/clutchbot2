require('dotenv').config();

const connectToDB = require('./connectToDB');
const csv = require('csv-parser');
const fs = require('fs');
const _ = require('lodash');
const Card = require('../models/Card');

connectToDB().then(() => {
    const readStream = fs.createReadStream('./assets/cards.csv');
    let records = [];
    readStream.pipe(csv(['cardNumber', 'year', 'series', 'cardType', 'position', 'name', 'rarity', 'cmdOb', 'salary']))
        .on('data', record => records.push(record))
        .on('end', () => {
            readStream.destroy();
            Card.deleteMany({}, () => {
                const cards = records.map(record => new Card(record));
                Card.insertMany(cards).then(docs => {
                    console.log('Success', docs.length);
                    process.exit();
                }).catch(err => {
                    console.log('Error', err);
                    process.exit();
                });
            });
        });
});