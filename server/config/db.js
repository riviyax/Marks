const mongoose = require('mongoose');

require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;

const dburl = MONGO_URI;

mongoose.set('strictQuery', true, "userNewUrlParser", true,);

const connection = async () => {
    try {
        await mongoose.connect(dburl);
        console.log('MongoDB connected...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};
module.exports = connection;