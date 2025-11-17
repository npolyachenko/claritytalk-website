# ClarityTalk Hume AI Proxy Server

Backend proxy server for integrating Hume AI's TTS (Octave) and Voice Analysis APIs with the ClarityTalk website.

## Features

- **Text-to-Speech (TTS)**: Generate expressive speech with emotional control using Hume AI Octave
- **Voice Analysis**: Analyze audio files for 48 emotional characteristics using Hume AI Prosody model
- **Secure API Key Management**: API keys are stored server-side and never exposed to the frontend
- **CORS Support**: Configured for local development with the ClarityTalk frontend

## Prerequisites

- Node.js 16+ installed
- Hume AI API key (get yours at [platform.hume.ai](https://platform.hume.ai/settings/keys))

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create your `.env` file from the example:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Hume AI API key:
```bash
HUME_API_KEY=your_actual_api_key_here
PORT=3001
```

**⚠️ Important**: Never commit your `.env` file. It's already in `.gitignore`.

## Running the Server

### Production Mode
```bash
npm start
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Verify It's Running

Open your browser and visit:
- **Health Check**: http://localhost:3001/health

You should see:
```json
{
  "status": "ok",
  "apiKeyConfigured": true
}
```

## API Endpoints

### 1. POST /api/tts
Generate expressive speech from text with specified emotion.

**Request Body** (JSON):
```json
{
  "text": "Я понимаю, что это важно для вас",
  "emotion": "calm"
}
```

**Available Emotions**:
- `calm` - Calm and reassuring tone
- `irritated` - Irritated and frustrated tone
- `anxious` - Worried and concerned tone
- `loving` - Warm and affectionate tone

**Response**: NDJSON stream of audio chunks

**Example with curl**:
```bash
curl -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you?",
    "emotion": "calm"
  }' \
  --output speech.mp3
```

### 2. POST /api/analyze-voice
Analyze audio file for emotional characteristics.

**Request**: `multipart/form-data` with audio file

**Supported Audio Formats**:
- MP3
- WAV
- M4A
- Other formats supported by Hume AI

**File Size Limit**: 10MB

**Response** (JSON):
```json
{
  "success": true,
  "emotions": [
    {
      "name": "Admiration",
      "score": 0.8453
    },
    {
      "name": "Contentment",
      "score": 0.7621
    },
    ...
  ],
  "totalFrames": 245
}
```

**Example with curl**:
```bash
curl -X POST http://localhost:3001/api/analyze-voice \
  -F "audio=@/path/to/your/audio.mp3"
```

### 3. GET /health
Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "apiKeyConfigured": true
}
```

## Testing the Integration

### 1. Test TTS Endpoint

**Using curl**:
```bash
# Generate speech with calm emotion
curl -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test", "emotion": "calm"}' \
  --output test-calm.mp3

# Play the audio (macOS)
afplay test-calm.mp3
```

**Using JavaScript (in browser console)**:
```javascript
fetch('http://localhost:3001/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello world',
    emotion: 'loving'
  })
})
.then(res => res.body)
.then(stream => {
  // Process stream...
  console.log('Audio generated successfully');
});
```

### 2. Test Voice Analysis Endpoint

**Prepare a test audio file** (you can record one or use any existing audio file)

**Using curl**:
```bash
curl -X POST http://localhost:3001/api/analyze-voice \
  -F "audio=@test-audio.mp3"
```

**Expected response**: JSON with emotion scores

### 3. Test with Frontend

1. Open `sample-report.html` in a browser (with a local server running)
2. Click "Загрузить и проанализировать аудио" in the Vocal Expression section
3. Upload an audio file
4. Click emotion buttons in the "Послушай разницу" section

## Troubleshooting

### API Key Issues

**Problem**: Getting "API key not configured" error

**Solution**:
1. Check that `.env` file exists in `/server` directory
2. Verify `HUME_API_KEY` is set correctly (no quotes needed)
3. Restart the server after changing `.env`

### CORS Errors

**Problem**: "Access-Control-Allow-Origin" errors in browser

**Solution**: 
- Server is configured for CORS with all origins (`*`)
- If still having issues, check that you're accessing from `http://localhost` or `file://`

### Analysis Timeout

**Problem**: Voice analysis takes too long or times out

**Solution**:
- Default timeout is 2 minutes (60 polls × 2 seconds)
- Reduce audio file size or length
- Check Hume AI API status at [status.hume.ai](https://status.hume.ai)

### Audio Format Not Supported

**Problem**: Error when uploading audio file

**Solution**:
- Ensure file is in a supported format (MP3, WAV, M4A)
- Check file size is under 10MB
- Try converting to MP3 using online tools or ffmpeg:
```bash
ffmpeg -i input.wav -codec:a libmp3lame output.mp3
```

### TTS Generation Fails

**Problem**: No audio generated from TTS endpoint

**Solution**:
- Check server logs for error messages
- Verify API key has TTS permissions
- Try with shorter text (under 500 characters)
- Check network connectivity to Hume AI servers

## Development Notes

### Temporary Files

Audio files uploaded for analysis are temporarily stored in `server/temp/` and automatically deleted after processing.

This directory is git-ignored and created automatically if it doesn't exist.

### Logging

Server logs all requests with timestamps and details:
- `[TTS]` - Text-to-speech operations
- `[ANALYZE]` - Voice analysis operations

Watch the console for debugging information.

### Rate Limiting

The server does not implement rate limiting. For production use, consider adding:
- `express-rate-limit` package
- IP-based request throttling
- API key usage tracking

## Production Deployment

⚠️ **This server is designed for local development**. For production:

1. **Use HTTPS**: Deploy behind a reverse proxy (nginx, Cloudflare)
2. **Restrict CORS**: Update CORS settings to whitelist only your domain
3. **Add Rate Limiting**: Prevent API abuse
4. **Environment Variables**: Use proper secrets management (AWS Secrets Manager, etc.)
5. **Monitoring**: Add logging and error tracking (Sentry, LogRocket)
6. **Caching**: Cache TTS results for common phrases

## Architecture

```
Frontend (sample-report.html)
    ↓
    ├── emotion-demo.js
    │   ├── VoiceAnalyzer class → POST /api/analyze-voice
    │   └── EmotionTTSDemo class → POST /api/tts
    ↓
Backend (server.js)
    ↓
Hume AI API
    ├── TTS API (Octave)
    └── Expression Measurement API (Prosody)
```

## Support

For issues related to:
- **Hume AI API**: Check [Hume AI Documentation](https://dev.hume.ai/) or [Discord](https://discord.gg/hume)
- **This integration**: Open an issue in the repository

## License

ISC
