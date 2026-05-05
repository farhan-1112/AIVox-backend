import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Force create database and collections via raw driver insertion
    const db = conn.connection.db;
    const usersColl = db.collection('users');
    const chatsColl = db.collection('chats');

    const userCount = await usersColl.countDocuments();
    if (userCount === 0) {
      await usersColl.insertOne({ 
        name: 'Init User', 
        email: 'init@aivox.com', 
        password: 'init_password_hash', 
        createdAt: new Date(), 
        updatedAt: new Date() 
      });
      console.log('Force-created "users" collection with dummy data.');
    }

    const chatCount = await chatsColl.countDocuments();
    if (chatCount === 0) {
      await chatsColl.insertOne({ 
        message: 'Hello AI', 
        response: 'Hello user! Welcome to AIVox.', 
        createdAt: new Date(), 
        updatedAt: new Date() 
      });
      console.log('Force-created "chats" collection with dummy data.');
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('Server continuing without DB connection. Please check MONGO_URI in .env');
  }
};

export default connectDB;
