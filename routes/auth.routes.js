import express from 'express';
import { signup, login, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);

// Friendly fallback for users navigating to API in browser
router.get('/signup', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>AIVox Backend API</h2>
        <p>This is a <b>POST</b> endpoint for signing up.</p>
        <p>You cannot access it directly in the browser via a GET request.</p>
        <p>Please open your <b>Frontend App (http://localhost:8080/signup)</b> to use the sign-up form.</p>
      </body>
    </html>
  `);
});

router.get('/login', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>AIVox Backend API</h2>
        <p>This is a <b>POST</b> endpoint for logging in.</p>
        <p>Please open your <b>Frontend App (http://localhost:8080/login)</b> to use the login form.</p>
      </body>
    </html>
  `);
});

export default router;
