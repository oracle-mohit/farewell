const mongoose = require('mongoose');
require('dotenv').config(); // Ensure dotenv is loaded

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI; // Get the connection string from environment variables
        if (!uri) {
            throw new Error('MONGO_URI is missing in .env');
        }
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected!');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1); // Exit the process with failure
    }
};

module.exports = connectDB;
