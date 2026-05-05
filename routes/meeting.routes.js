import express from 'express';
import { createMeeting, getMeetings, deleteMeeting } from '../controllers/meeting.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/create', protect, createMeeting);
router.get('/list', protect, getMeetings);
router.delete('/:id', protect, deleteMeeting);

export default router;
