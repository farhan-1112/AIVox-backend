import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/user.model.js';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fallback if DB not connected or it's a mock user
      if (mongoose.connection.readyState !== 1 || (decoded.id && decoded.id.toString().startsWith('mock_'))) {
        req.user = { _id: decoded.id };
        return next();
      }

      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authorized, user not found' },
        });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authorized, token failed' },
      });
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authorized, no token' },
    });
  }
};

export { protect };

