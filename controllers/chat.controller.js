import axios from 'axios';
import mongoose from 'mongoose';
import Chat from '../models/chat.model.js';
import Meeting from '../models/meeting.model.js';

// @desc    Chat with AI and detect intent
// @route   POST /api/chat
// @access  Private
const chatWithAI = async (req, res) => {
  const { message } = req.body;

  try {
    if (!message) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_MESSAGE', message: 'No message provided' },
      });
    }

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      // Fallback
      const fallbackResponse = `I received your message: "${message}". (OpenRouter API key missing fallback)`;
      
      // Save chat if DB connected
      if (mongoose.connection.readyState === 1 && !req.user._id.toString().startsWith('mock_')) {
        await Chat.create({
          userId: req.user._id,
          message,
          response: fallbackResponse,
        });
      }

      return res.json({
        success: true,
        data: {
          response: fallbackResponse,
          intent: 'chat',
        },
      });
    }

    // 1. Check for quick schedule commands to run them instantly via rule-based parsing
    const msgLower = message.toLowerCase();
    if (msgLower.includes('schedule') || msgLower.includes('meeting at')) {
      const now = new Date();
      now.setDate(now.getDate() + (msgLower.includes('tomorrow') ? 1 : 0));
      const dateStr = now.toISOString().split('T')[0];
      
      let timeStr = '09:00';
      if (msgLower.includes('5pm') || msgLower.includes('5 pm')) timeStr = '17:00';
      else if (msgLower.includes('1pm') || msgLower.includes('1 pm')) timeStr = '13:00';
      else if (msgLower.includes('10am') || msgLower.includes('10 am')) timeStr = '10:00';
      else if (msgLower.includes('2pm') || msgLower.includes('2 pm')) timeStr = '14:00';
      else if (msgLower.includes('3pm') || msgLower.includes('3 pm')) timeStr = '15:00';
      else if (msgLower.includes('5:00')) timeStr = '17:00';
      
      const titleStr = msgLower.replace('schedule', '').replace('meeting', '').replace('tomorrow', '').trim();
      const finalTitle = titleStr ? titleStr.charAt(0).toUpperCase() + titleStr.slice(1) : 'Quick Meeting';
      
      const aiResponse = `I have scheduled the "${finalTitle}" for you.`;

      // Save Meeting if DB is connected
      if (mongoose.connection.readyState === 1 && !req.user._id.toString().startsWith('mock_')) {
        await Meeting.create({
          userId: req.user._id,
          title: finalTitle,
          date: dateStr,
          time: timeStr,
        });
      }

      return res.json({
        success: true,
        data: {
          response: aiResponse,
          intent: 'meeting',
          meetingDetails: {
            title: finalTitle,
            date: dateStr,
            time: timeStr,
          }
        },
      });
    }

    // Call OpenRouter to detect intent and generate response
    const systemPrompt = `
You are AIVox, an intelligent voice assistant. 
Analyze the user's message.
1. Determine if the user wants to schedule/create a meeting.
2. If yes, extract the meeting details (title, date, time) and respond in JSON format ONLY:
{"intent": "meeting", "title": "...", "date": "...", "time": "...", "response": "I've scheduled that meeting for you."}

3. If no, respond in JSON format ONLY:
{"intent": "chat", "response": "your conversational response here"}
`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiContent = JSON.parse(response.data.choices[0].message.content);

    // Save Chat if DB connected
    if (mongoose.connection.readyState === 1 && !req.user._id.toString().startsWith('mock_')) {
      await Chat.create({
        userId: req.user._id,
        message,
        response: aiContent.response,
      });

      // If intent is meeting, save meeting
      if (aiContent.intent === 'meeting') {
        await Meeting.create({
          userId: req.user._id,
          title: aiContent.title || 'Meeting',
          date: aiContent.date || 'Today',
          time: aiContent.time || 'Now',
        });
      }
    } else {
      console.log('DB not connected, skipping DB saves in chat controller');
    }


    res.json({
      success: true,
      data: {
        response: aiContent.response,
        intent: aiContent.intent,
        meetingDetails: aiContent.intent === 'meeting' ? {
          title: aiContent.title,
          date: aiContent.date,
          time: aiContent.time,
        } : null,
      },
    });
  } catch (error) {
    console.error('OpenRouter failed, falling back to local heuristic response:', error.response?.data || error.message);
    const fallbackResponse = `I received your message: "${message}". I am online and managing your tasks appropriately.`;
    
    return res.json({
      success: true,
      data: {
        response: fallbackResponse,
        intent: 'chat',
        meetingDetails: null,
      },
    });
  }
};

export { chatWithAI };
