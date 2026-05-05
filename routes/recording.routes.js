import express from 'express';
import multer from 'multer';
import { uploadRecording, getTranscripts } from '../controllers/recording.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', protect, upload.single('audio'), uploadRecording);
router.get('/list', protect, getTranscripts);

export default router;
