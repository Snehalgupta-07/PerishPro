const mongoose = require('mongoose');

const connectMongoDB = async (url) => {
    if (!url) {
        throw new Error('MongoDB connection string is required. Set MONGODB_URL in .env or provide a valid URI.');
    }
    return mongoose.connect(url);
};

module.exports = {connectMongoDB};