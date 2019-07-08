const getCardUrl = require('../utils/getCardUrl');

module.exports = async (c, index) => {
    const space = () => `${index + 1}.${index + 1 < 10 ? '  ' : ''}`;
    let cardUrl;
    try {
        cardUrl = await getCardUrl(c.name);
    } catch (err) {
        cardUrl = 'www.clutchmoment.com';
        console.log(err);
    }
    const cardLink = `<${cardUrl}|${c.name}>`;
    if (c.cardType === 'Batter' || c.cardType === 'Pitcher') {
        return `${space()} [*${c.rarity}*] ${cardLink} - ${c.position} - ${c.cmdOb.trim()} - $${c.salary}`;
    } else if (c.cardType === 'Strategy') {
        return `${space()} [*${c.rarity}*] ${cardLink} - ${c.position}`;
    } else if (c.cardType === 'Stadium') {
        return `${space()} [*${c.rarity}*] ${cardLink}`;
    }
};
