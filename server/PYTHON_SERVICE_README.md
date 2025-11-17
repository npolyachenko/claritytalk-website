# ClarityTalk Python Service

This service handles speech-to-text transcription (Whisper) and speaker diarization (pyannote.audio).

## Quick Start

### 1. Install Python Dependencies

```bash
cd server
pip install -r requirements.txt
```

**Note:** This will download Whisper models (~150MB for base model) on first run.

### 2. (Optional) Setup Speaker Diarization

Speaker diarization requires a HuggingFace token:

1. Create account at https://huggingface.co/
2. Accept pyannote terms: https://huggingface.co/pyannote/speaker-diarization-3.1
3. Get your token: https://huggingface.co/settings/tokens
4. Add to `.env`:

```bash
echo "HUGGINGFACE_TOKEN=your_token_here" >> .env
```

**Without token:** Transcription will work, but speaker diarization will be disabled.

### 3. Start Python Service

```bash
python python_service.py
```

Service will run on `http://localhost:5001`

### 4. Start Node.js Server (in another terminal)

```bash
node server.js
```

## API Endpoints

### Health Check
```bash
curl http://localhost:5001/health
```

### Transcribe Audio
```bash
curl -X POST http://localhost:5001/transcribe \
  -F "audio=@your_audio.mp3"
```

### Speaker Diarization
```bash
curl -X POST http://localhost:5001/diarize \
  -F "audio=@your_audio.mp3"
```

### Full Analysis (Transcription + Diarization)
```bash
curl -X POST http://localhost:5001/analyze-full \
  -F "audio=@your_audio.mp3"
```

## Models Used

- **Whisper:** `base` model (39M parameters, ~150MB)
  - Upgrade to `medium` (769M) or `large` (1550M) for better accuracy
  - Change in `python_service.py` line 34

- **Pyannote:** `speaker-diarization-3.1`
  - State-of-the-art speaker diarization
  - Requires HuggingFace token

## Troubleshooting

### `torch not found`
```bash
pip install torch
```

### `ffmpeg not found`
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg
```

### Speaker diarization not working
- Make sure HUGGINGFACE_TOKEN is set in `.env`
- Accept pyannote terms at https://huggingface.co/pyannote/speaker-diarization-3.1

## Performance

- **Whisper base:** ~1x realtime (5 min audio = 5 min processing)
- **Whisper medium:** ~4x realtime
- **Speaker diarization:** ~2x realtime

**Tips:**
- Use GPU for 10x faster processing
- Install with: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118`
