import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import recordingRoutes from './routes/recording.routes.js';
import chatRoutes from './routes/chat.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import ttsRoutes from './routes/tts.routes.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/record', recordingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/tts', ttsRoutes);

// DB Status endpoint
app.get('/api/db-status', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateCode = mongoose.connection.readyState;
  res.json({
    success: true,
    connected: stateCode === 1,
    status: states[stateCode] || 'unknown',
    stateCode
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('AIVox API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
