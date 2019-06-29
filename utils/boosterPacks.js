const _ = require('lodash');
const Card = require('../models/Card');

const getCard = async args => {
    const cards = await Card.aggregate([
        { $match: args },
        { $sample: { size: 1 } }
    ]);
    return cards[0];
}

const series1PackBuilder = {
    // Card 15 – One random rare from 38 cards – 25 rare pitchers, 10 rare strats, 3 rare stadiums
    async card15() {
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'R',
            cardType: {
                '$in': ['Pitcher', 'Strategy', 'Stadium'],
            }
        });
    },

    // Card 14 – One random rare from 50 cards – 25 rare pitchers, 25 rare batters
    //    (if a pitcher was chosen for card 15 then its automatically a batter)
    async card14(pack) {
        let cardTypes = ['Batter'];

        // Allow a pitcher to be chosen if one wasn't chosen for Card 15
        if (pack[0].cardType !== 'Pitcher') {
            cardTypes.push('Pitcher');
        }
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'R',
            _id: { $ne: pack[0]._id },
            cardType: {
                '$in': cardTypes
            }
        });
    },

    // Card 13 – One random uncommon pitcher from 52 cards (uncommon pitchers)
    async card13() {
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'U',
            cardType: 'Pitcher'
        });
    },

    // Card 12 – One random uncommon batter from 53 cards (uncommon batters)
    async card12() {
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'U',
            cardType: 'Batter'
        });
    },

    // Card 11 – One random uncommon from 81 cards – 51 rare pitchers, 20 rare strats, 10 rare stadiums)
    //  (removing card 13 from the possibilities)
    async card11(pack) {
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'U',
            cardType: {
                '$in': ['Pitcher', 'Strategy', 'Stadium'],
            },
            // pack[2] = Card 13
            _id: { $ne: pack[2]._id }
        });
    },

    // Card 10 – One random uncommon player from 102 or 103 cards – 50 or 51 pitchers, 52 batters
    //  (removing cards 13, 12 and 11 from the possibilities)
    //  (if a pitcher was chosen for card 11 then its automatically a batter)
    async card10(pack) {
        // pack[4] = Card 11
        const cardType = pack[4].cardType === 'Pitcher' ? 'Batter' : { '$in': ['Pitcher', 'Batter'] };

        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'U',
            cardType,
            _id: { $nin: pack.map(card => card._id) }
        });
    },

    // Card 9 – One random common strat from 40 cards
    async card9(pack) {
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'C',
            cardType: 'Strategy'
        });
    },

    // Card 8 – One random common pitcher from 41 cards
    async card8(pack) {
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'C',
            cardType: 'Pitcher',
            _id: { $nin: pack.map(card => card._id) }
        });
    },

    // Card 7 – One random common pitcher from 41 cards
    async card7(pack) {
        return await this.card8(pack);
    },

    //Card 6 – One random common pitcher from 41 cards
    async card6(pack) {
        return await this.card8(pack);
    },

    // Card 5 – One random common batter from 40 cards
    async card5(pack) {
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'C',
            cardType: 'Batter',
            _id: { $nin: pack.map(card => card._id) }
        });
    },

    // Card 4 – One random common batter from 41 cards
    async card4(pack) {
        return await this.card5(pack);
    },

    // Card 3 – One random common batter from 41 cards
    async card3(pack) {
        return await this.card5(pack);
    },

    // Card 2 – One random common from 176 cards – 120 common pitchers, 39 common strats, 17 common stadiums
    // (removing cards 9, 8, 7 and 6 from the possibilities)
    async card2(pack) {
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'C',
            cardType: {
                '$in': ['Pitcher', 'Strategy', 'Stadium'],
            },
            _id: { $nin: pack.map(card => card._id) }
        });
    },

    // Card 1 – One random common from 238 or 239 cards – 119 or 120 common pitchers, 119 common batters
    //  (removing cards 8, 7, 6, 5, 4, 3 and 2 from the possibilities) (if a pitcher was chosen for card 2 then its automatically a batter)
    async card1(pack) {
        // pack[13] = Card 2
        const cardType = pack[13].cardType === 'Pitcher' ? 'Batter' : { '$in': ['Pitcher', 'Batter'] };
        return await getCard({
            year: '2019',
            series: 'Series 1',
            rarity: 'C',
            cardType,
            _id: { $nin: pack.map(card => card._id) }
        });
    },
};

const series1 = async () => {
    let pack = [];
    for (let i = 0; i < 15; i++) {
        pack.push(await _.invoke(series1PackBuilder, `card${15 - i}`, pack));
    }
    const cards = await Card.find({
        year: '2019',
        series: 'Series 1'
    });
    console.log('pack', pack);
    return pack.reverse();
}

module.exports = {
    series1
};