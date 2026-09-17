const express = require('express');
const path = require('path');
const googleTTS = require('google-tts-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to generate TTS audio base64/URL
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang = 'th', speed = 1 } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // google-tts-api handles text chunking automatically
    const base64AudioList = await googleTTS.getAllAudioBase64(text, {
      lang: lang,
      slow: speed < 1,
      host: 'https://translate.google.com',
      timeout: 10000,
    });

    // Combine base64 chunks into a single audio buffer
    const buffers = base64AudioList.map(item => Buffer.from(item.base64, 'base64'));
    const combinedBuffer = Buffer.concat(buffers);

    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Length': combinedBuffer.length,
      'Content-Disposition': 'inline; filename="voiceover.mp3"',
    });

    return res.send(combinedBuffer);
  } catch (error) {
    console.error('TTS Generation error:', error);
    return res.status(500).json({ error: 'Failed to generate TTS audio', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎤 VDO Voice Studio Web App is running at http://localhost:${PORT}`);
});
