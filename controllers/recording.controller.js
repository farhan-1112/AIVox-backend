import { createClient } from '@deepgram/sdk';
import mongoose from 'mongoose';
import Transcript from '../models/transcript.model.js';
import fs from 'fs';

import path from 'path';

// Persistent file fallback for demo
const mockTranscriptsFile = path.resolve('mock_transcripts.json');
let mockTranscripts = [];
if (fs.existsSync(mockTranscriptsFile)) {
  try {
    mockTranscripts = JSON.parse(fs.readFileSync(mockTranscriptsFile, 'utf8'));
  } catch (err) {
    mockTranscripts = [];
  }
}

const saveMockTranscripts = () => {
  fs.writeFileSync(mockTranscriptsFile, JSON.stringify(mockTranscripts, null, 2));
};

// @desc    Upload and transcribe audio
// @route   POST /api/record/upload
// @access  Private
const uploadRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No audio file uploaded' },
      });
    }

    if (!process.env.DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY === 'your_deepgram_api_key_here') {
      // Fallback for testing if key is not provided
      const fallbackText = "This is a fallback transcript because no Deepgram API key was provided.";
      const transcript = await Transcript.create({
        userId: req.user._id,
        text: fallbackText,
        audioUrl: 'fallback_url',
      });

      return res.status(201).json({
        success: true,
        data: {
          transcript: transcript.text,
          audioUrl: transcript.audioUrl,
          createdAt: transcript.createdAt,
        },
      });
    }

    // Use axios to directly call Deepgram REST API to avoid SDK Buffer/mimetype issues
    let result, error;
    try {
      const axios = (await import('axios')).default;
      const dgResponse = await axios.post(
        'https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2',
        req.file.buffer,
        {
          headers: {
            'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
            'Content-Type': req.file.mimetype.split(';')[0] || 'audio/webm',
            'Content-Length': req.file.buffer.length
          },
        }
      );
      result = dgResponse.data;
    } catch (e) {
      error = e.response?.data || e;
    }

    if (error) {
      console.error("Deepgram raw error:", error);
      if (error.err_code === 'Bad Request' || error.status === 400) {
        // Browser recording was empty or unreadable
        result = null;
      } else {
        throw new Error(error.err_msg || error.message || 'Deepgram transcription failed');
      }
    }

    const transcriptText = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "[No speech detected]";

    if (mongoose.connection.readyState !== 1 || req.user._id.toString().startsWith('mock_')) {
      console.log('DB not connected, using in-memory fallback for uploadRecording');
      const mockTranscript = {
        _id: `mock_trans_${Date.now()}`,
        userId: req.user._id,
        text: transcriptText,
        audioUrl: 'stored_audio_url_placeholder',
        createdAt: new Date(),
      };
      mockTranscripts.push(mockTranscript);
      saveMockTranscripts();

      return res.status(201).json({
        success: true,
        data: {
          transcript: mockTranscript.text,
          audioUrl: mockTranscript.audioUrl,
          createdAt: mockTranscript.createdAt,
        },
      });
    }

    const transcript = await Transcript.create({
      userId: req.user._id,
      text: transcriptText,
      audioUrl: 'stored_audio_url_placeholder', // In a real app, upload to S3/Cloudinary first
    });

    res.status(201).json({
      success: true,
      data: {
        transcript: transcript.text,
        audioUrl: transcript.audioUrl,
        createdAt: transcript.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
};

// @desc    Get all transcripts for a user
// @route   GET /api/record/list
// @access  Private
const getTranscripts = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('DB not connected, using in-memory fallback for getTranscripts');
      const userTranscripts = mockTranscripts.filter(t => t.userId === req.user._id);
      return res.json({
        success: true,
        data: userTranscripts,
      });
    }

    const transcripts = await Transcript.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: transcripts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
};

export { uploadRecording, getTranscripts };

