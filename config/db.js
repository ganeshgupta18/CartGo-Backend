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

  // If a connection is already being established, wait for it
  if (global._mongoosePromise) {
    console.log('Waiting for existing connection promise...');
    cachedConnection = await global._mongoosePromise;
    return cachedConnection;
  }

  try {
    console.log('Connecting to MongoDB...');
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };
    
    global._mongoosePromise = mongoose.connect(process.env.MONGO_URI, opts);
    cachedConnection = await global._mongoosePromise;
    
    // Safely log the host (sometimes connection.host is not immediately available on the returned object depending on mongoose version)
    const host = cachedConnection.connection?.host || mongoose.connection?.host || 'unknown';
    console.log(`MongoDB Connected: ${host}`);
    
    return cachedConnection;
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    global._mongoosePromise = null; // Reset promise on error
    throw error;
  }
};

module.exports = connectDB;
