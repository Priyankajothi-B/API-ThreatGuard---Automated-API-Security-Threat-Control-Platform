const mongoose = require('mongoose');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  // In unit testing environment, resolve immediately if no external MONGODB_URI is provided
  if (process.env.NODE_ENV === 'test' && !process.env.MONGODB_URI) {
    console.log('[Test Environment] Skipping remote DB connection for lightweight unit testing.');
    return;
  }

  try {
    let uri = process.env.MONGODB_URI;

    if (!uri) {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        console.log(`Embedded MongoDB Memory Server running at: ${uri}`);
      } catch (memErr) {
        console.warn('MongoMemoryServer fallback skipped:', memErr.message);
        return;
      }
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected successfully.');
  } catch (error) {
    console.warn('MongoDB connection warning (non-fatal):', error.message);
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = { connectDB, disconnectDB };
