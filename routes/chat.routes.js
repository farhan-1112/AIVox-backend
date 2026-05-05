import express from 'express';
import { chatWithAI } from '../controllers/chat.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, chatWithAI);

export default router;
