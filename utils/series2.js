const _ = require('lodash');
const Card = require('../models/Card');

const getCard = async args => {
    const cards = await Card.aggregate([
        { $match: args },
        { $sample: { size: 1 } }
    ]);
    return cards[0];
}

const series2PackBuilder = {
    // Card 15 – One random ultra-rare from 30 cards – 10 cleveland, 10 all-star, 10 generations
    //    ** ONE OUT OF 6 CHANCE OF THIS CARD BEING A LE9 ULTRA RARE – if so random out of  24
    //    ** ONE OUT OF 10 CHANCE THAT THE ULTRA-RARE IS A LE1 INSTEAD – if so random out of 24
    async card15() {
        let limitedEdition = '';
        if (_.random(1, 6) === 1) {
            // Generate a LE9
            limitedEdition = 'LE9';
        } else if (_.random(1, 10) === 1) {
            // Generate a LE1
            limitedEdition = 'LE1';
        }
        let extraConfig;
        if (limitedEdition) {
            extraConfig = {
                cardType: {
                    '$in': ['Batter', 'Pitcher']
                },
                cardNumber: { $nin: _.times(20, index => `l${(index + 1)}`) },
                rarity: {
                    '$in': ['UR', 'R']
                }
            };
        } else {
            extraConfig = {
                rarity: 'UR'
            };
        }
        const card = await getCard({
            year: '2019',
            series: 'Series 2',
            ...extraConfig
        });

        card.limitedEdition = limitedEdition;
        return card;
    },

    // Card 14 – One random rare from 17 cards – 8 rare strats, 2 rare stadiums, 7 rare pitchers
    //    ** IF AN LE9 or LE1 CARD WAS CHOSEN FOR CARD 15 then this spot is SKIPPED in the pack build and card 0 is added at the end.
    async card14(pack) {
        let cardTypes = ['Pitcher', 'Stadium', 'Strategy'];

        // If the previous card was a limited edition, skip this pick.
        // If skipped, this pick will be replaced with a selection from card 15.
        if (pack[0].limitedEdition) {
            return;
        }
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'R',
            cardType: {
                '$in': cardTypes
            }
        });
    },

    // Card 13 – One random rare from 14 cards – 7 rare pitchers, 7 rare batters (if a pitcher was chosen for card 14 then its
    //    automatically a batter and if a batter was chosen for card 14 (via an LE9 or LE1) then its automatically a pitcher)
    async card13(pack) {
        let cardTypes;

        // Check if card 14 exists and was a pitcher
        if (pack[1] && pack[1].cardType === 'Pitcher') {
            cardTypes = ['Batter'];
        } else if (pack[0].limitedEdition && pack[0].cardType === 'Batter') {
            cardTypes = ['Pitcher'];
        } else {
            cardTypes = ['Batter', 'Pitcher'];
        }
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'R',
            cardType: {
                '$in': cardTypes
            }
        });
    },

    // Card 12 – One random uncommon strat from 20 cards
    async card12() {
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'U',
            cardType: 'Strategy'
        });
    },

    // Card 11 – One random uncommon pitcher from 14 cards
    async card11() {
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'U',
            cardType: 'Pitcher'
        });
    },

    // Card 10 – One random uncommon batter from 14 cards
    async card10() {
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'U',
            cardType: 'Batter'
        });
    },

    // Card 9 – One random uncommon from 45 cards – 14 uncommon pitchers, 14 uncommon batters,
    //    20 uncommon strats) (removing cards 12, 11 and 10 from the possibilities)
    async card9(pack) {
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'U',
            cardType: {
                '$in': ['Batter', 'Pitcher', 'Strategy']
            },
            _id: { $nin: pack.filter(card => card).map(card => card._id) }
        });
    },

    // Card 8 – One random common pitcher from 49 cards
    async card8(pack) {
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'C',
            cardType: 'Pitcher',
            _id: { $nin: pack.filter(card => card).map(card => card._id) }
        });
    },

    // Card 7 – One random common pitcher from 48 cards (removing card 8 from the possibilities)
    async card7(pack) {
        return await this.card8(pack);
    },

    // Card 6 – One random common pitcher from 47 cards (removing cards 8 and 7 from the possibilities)
    async card6(pack) {
        return await this.card8(pack);
    },

    // Card 5 – One random common pitcher from 46 cards (removing cards 8, 7 and 6 from the possibilities)
    async card5(pack) {
        return await this.card8(pack);
    },

    // Card 4 – One random common batter from 49 cards
    async card4(pack) {
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'C',
            cardType: 'Batter',
            _id: { $nin: pack.filter(card => card).map(card => card._id) }
        });
    },

    // Card 3 – One random common batter from 48 cards (removing card 4 from the possibilities)
    async card3(pack) {
        return await this.card4(pack);
    },

    // Card 2 – One random common batter from 47 cards (removing cards 4 and 3 from the possibilities)
    async card2(pack) {
        return await this.card4(pack);
    },

    // Card 1 – One random common batter from 46 cards (removing cards 4, 3 and 2 from the possibilities)
    async card1(pack) {
        return await this.card4(pack);
    },

    // Card 0 – IF CARD 13 WAS SKIPPED – One random common from 90 cards
    //    (removing cards 8, 7, 6, 5, 4, 3, 2 and 1 from the possibilities)
    async card0(pack) {
        // pack[1] = Card 14
        // This means a LE has been picked, we do not need to make a selection here
        if (pack[1]) {
            return;
        }
        return await getCard({
            year: '2019',
            series: 'Series 2',
            rarity: 'C',
            _id: { $nin: pack.filter(card => card).map(card => card._id) }
        });
    },
};

const series2 = async () => {
    let pack = [];
    for (let i = 0; i <= 15; i++) {
        pack.push(await _.invoke(series2PackBuilder, `card${15 - i}`, pack));
    }
    return pack.filter(card => card).reverse();
}


module.exports = {
    series2
};
