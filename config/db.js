const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using existing MongoDB connection');
    return cachedConnection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  try {
    console.log('Connecting to MongoDB...');
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
    };
    cachedConnection = await mongoose.connect(process.env.MONGO_URI, opts);
    console.log(`MongoDB Connected: ${cachedConnection.connection.host}`);
    return cachedConnection;
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
