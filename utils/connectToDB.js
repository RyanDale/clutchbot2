const mongoose = require('mongoose');

module.exports = async function () {
    return mongoose.connect(process.env.MONGO_URI, {}).catch(err => {
        console.log('Error connecting to MongoDB', err);
    });
}
