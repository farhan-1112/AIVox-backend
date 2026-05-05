import axios from 'axios';

// @desc    Convert text to speech
// @route   POST /api/tts
// @access  Private
const textToSpeech = async (req, res) => {
  const { text } = req.body;

  try {
    if (!text) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_TEXT', message: 'No text provided' },
      });
    }

    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === 'your_elevenlabs_api_key_here') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_KEY', message: 'ElevenLabs API key missing' },
      });
    }

    const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah (Premade - works on Free tier)

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': response.data.byteLength || response.data.length,
    });

    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('TTS Error:', error.response ? Buffer.from(error.response.data).toString() : error.message);
    
    const errorMessage = error.response 
      ? `ElevenLabs Error: ${Buffer.from(error.response.data).toString()}` 
      : error.message;

    res.status(error.response?.status || 500).json({
      success: false,
      error: { 
        code: 'TTS_ERROR', 
        message: errorMessage
      },
    });
  }
};

export { textToSpeech };
