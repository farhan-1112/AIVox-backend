import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import User from '../models/user.model.js';

// Persistent file fallback for demo when DB is not whitelisted
const mockUsersFile = path.resolve('mock_users.json');
let mockUsers = [];
if (fs.existsSync(mockUsersFile)) {
  try {
    mockUsers = JSON.parse(fs.readFileSync(mockUsersFile, 'utf8'));
  } catch (err) {
    mockUsers = [];
  }
}

const saveMockUsers = () => {
  fs.writeFileSync(mockUsersFile, JSON.stringify(mockUsers, null, 2));
};

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const mockUserExists = mockUsers.find(u => u.email === email);
    let atlasUserExists = null;
    if (mongoose.connection.readyState === 1) {
      atlasUserExists = await User.findOne({ email });
    }

    if (mockUserExists || atlasUserExists) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'User already exists' },
      });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.create({ name, email, password });
      return res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          token: generateToken(user._id),
        },
      });
    } else {
      const newUser = {
        _id: `mock_${Date.now()}`,
        name,
        email,
        password,
      };
      mockUsers.push(newUser);
      saveMockUsers();

      return res.status(201).json({
        success: true,
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          token: generateToken(newUser._id),
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email });
    }

    if (user && (await user.matchPassword(password))) {
      return res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          token: generateToken(user._id),
        },
      });
    }

    console.log('Login fallback: checking mock persistence for user');
    const mockUser = mockUsers.find(u => u.email === email && u.password === password);
    if (mockUser) {
      return res.json({
        success: true,
        data: {
          _id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
          token: generateToken(mockUser._id),
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    let user = null;
    if (mongoose.connection.readyState === 1 && !req.user._id.toString().startsWith('mock_')) {
      user = await User.findById(req.user._id);
    }

    if (user) {
      return res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    }

    const mockUser = mockUsers.find(u => u._id === req.user._id.toString());
    if (mockUser) {
      return res.json({
        success: true,
        data: {
          _id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });
    }

    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
};

export { signup, login, getMe };

