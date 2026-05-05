import express from 'express';
import { textToSpeech } from '../controllers/tts.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, textToSpeech);

export default router;
