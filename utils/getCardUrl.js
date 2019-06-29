module.exports = text => {
    const fileName = text.replace(/[^a-z0-9+]+/gi, '').toLowerCase();
    return `${process.env.CARD_URL}/${fileName}.png`;
};