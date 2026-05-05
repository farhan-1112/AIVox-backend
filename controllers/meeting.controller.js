import mongoose from 'mongoose';
import Meeting from '../models/meeting.model.js';

import fs from 'fs';
import path from 'path';

// Persistent file fallback for demo
const mockMeetingsFile = path.resolve('mock_meetings.json');
let mockMeetings = [];
if (fs.existsSync(mockMeetingsFile)) {
  try {
    mockMeetings = JSON.parse(fs.readFileSync(mockMeetingsFile, 'utf8'));
  } catch (err) {
    mockMeetings = [];
  }
}

const saveMockMeetings = () => {
  fs.writeFileSync(mockMeetingsFile, JSON.stringify(mockMeetings, null, 2));
};

// @desc    Create a meeting manually
// @route   POST /api/meeting/create
// @access  Private
const createMeeting = async (req, res) => {
  const { title, date, time } = req.body;

  try {
    if (!title || !date || !time) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Please provide title, date, and time' },
      });
    }

    if (mongoose.connection.readyState !== 1 || req.user._id.toString().startsWith('mock_')) {
      console.log('DB not connected, using in-memory fallback for createMeeting');
      const meeting = {
        _id: `mock_meet_${Date.now()}`,
        userId: req.user._id,
        title,
        date,
        time,
        createdAt: new Date(),
      };
      mockMeetings.push(meeting);
      saveMockMeetings();

      return res.status(201).json({
        success: true,
        data: meeting,
      });
    }

    const meeting = await Meeting.create({
      userId: req.user._id,
      title,
      date,
      time,
    });

    res.status(201).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
};

// @desc    Get all meetings for a user
// @route   GET /api/meeting/list
// @access  Private
const getMeetings = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || req.user._id.toString().startsWith('mock_')) {
      console.log('DB not connected, using in-memory fallback for getMeetings');
      const userMeetings = mockMeetings.filter(m => m.userId === req.user._id);
      return res.json({
        success: true,
        data: userMeetings,
      });
    }

    const meetings = await Meeting.find({ userId: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: meetings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
};

// @desc    Delete a meeting
// @route   DELETE /api/meeting/:id
// @access  Private
const deleteMeeting = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || req.user._id.toString().startsWith('mock_')) {
      const index = mockMeetings.findIndex(m => m._id === req.params.id && m.userId === req.user._id);
      if (index !== -1) {
        mockMeetings.splice(index, 1);
        saveMockMeetings();
        return res.json({
          success: true,
          message: 'Meeting removed (In-Memory)',
        });
      } else {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Meeting not found' },
        });
      }
    }

    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meeting not found' },
      });
    }

    // Check ownership
    if (meeting.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
      });
    }

    await meeting.deleteOne();

    res.json({
      success: true,
      message: 'Meeting removed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
};

export { createMeeting, getMeetings, deleteMeeting };

