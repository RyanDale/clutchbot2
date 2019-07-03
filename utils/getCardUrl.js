module.exports = async text => {
    const fileName = text.replace(/[^a-z0-9+]+/gi, '').toLowerCase();
    const cardUrls = process.env.CARD_URL.split(',');
    let cardUrl = '';
    for (let i = 0; i < cardUrls.length; i++) {
        try {
            let url = await axios.get(`${cardUrls[i]}/${fileName}.png`);
            cardUrl = url;
            break;
        } catch (err) {}
    }
    if (cardUrl) {
        return cardUrl;
    } else {
        throw new Error('Card not found!');
    }
};