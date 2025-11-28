const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { HumeClient } = require('hume');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Hume AI client
const humeClient = new HumeClient({
  apiKey: process.env.HUME_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/tts
 * Generate speech from text with specified emotion
 * Body: { text: string, emotion: string }
 * Example: { text: "I understand this is important to you", emotion: "calm" }
 */
app.post('/api/tts', async (req, res) => {
  try {
    const { text, emotion } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Missing or invalid text parameter' });
    }

    console.log(`[TTS] Generating speech with emotion: ${emotion || 'neutral'}`);
    console.log(`[TTS] Text: "${text.substring(0, 50)}..."`);

    // Map emotions to Hume voice descriptions
    const emotionDescriptions = {
      calm: 'speaking calmly and reassuringly, with a gentle and peaceful tone',
      irritated: 'speaking with irritation and frustration, with a sharp and tense tone',
      anxious: 'speaking with worry and concern, with a nervous and hesitant tone',
      loving: 'speaking with warmth and affection, with a tender and caring tone'
    };

    const description = emotionDescriptions[emotion] || '';

    // Prepare utterance
    const utterance = {
      text: text.trim(),
      ...(description && { description })
    };

    // Generate speech using Hume TTS API
    // Note: instantMode is disabled because Hume requires a voice when instant mode is on.
    const stream = await humeClient.tts.synthesizeJsonStreaming({
      utterances: [utterance],
      stripHeaders: true,
      format: { type: 'mp3' },
      instantMode: false
    });

    console.log('[TTS] Stream initiated successfully');

    // Set response headers for audio streaming
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream audio chunks to client
    for await (const chunk of stream) {
      if (chunk.type === 'audio') {
        const jsonString = JSON.stringify(chunk);
        const ndjsonLine = jsonString + '\n';
        res.write(ndjsonLine);
      }
    }

    console.log('[TTS] Stream completed');
    res.end();

  } catch (error) {
    console.error('[TTS] Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.message 
    });
  }
});

/**
 * POST /api/analyze-voice
 * Analyze audio file for emotional characteristics
 * Form-data: audio file
 */
app.post('/api/analyze-voice', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`[ANALYZE] Analyzing audio file: ${req.file.originalname}`);
    console.log(`[ANALYZE] File size: ${(req.file.size / 1024).toFixed(2)} KB`);

    // Create a temporary file from buffer
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    try {
      // Configure models for prosody analysis
      const models = {
        prosody: {}
      };

      console.log('[ANALYZE] Starting Hume batch job (local file)...');
      console.log('[ANALYZE] Temp file path:', tempFilePath);
      console.log('[ANALYZE] File exists:', fs.existsSync(tempFilePath));

      // Use official SDK helper for local files
      const job = await humeClient.expressionMeasurement.batch.startInferenceJobFromLocalFile({
        file: [fs.createReadStream(tempFilePath)],
        json: { models }
      });

      console.log('[ANALYZE] Job object:', JSON.stringify(job, null, 2));
      const jobId = job.jobId;
      console.log(`[ANALYZE] Job ID: ${jobId}`);

      // Poll for completion
      let status = 'QUEUED';
      let attempts = 0;
      const maxAttempts = 60; // 60 attempts = ~2 minutes max wait
      
      while (status !== 'COMPLETED' && status !== 'FAILED' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const jobDetails = await humeClient.expressionMeasurement.batch.getJobDetails(jobId);
        status = jobDetails.state.status;
        
        console.log(`[ANALYZE] Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
        attempts++;
        
        if (status === 'FAILED') {
          throw new Error('Hume job failed: ' + jobDetails.state.message);
        }
      }

      if (status !== 'COMPLETED') {
        throw new Error('Analysis timeout - job did not complete in time');
      }

      // Fetch predictions using SDK
      console.log('[ANALYZE] Fetching predictions...');
      const predictions = await humeClient.expressionMeasurement.batch.getJobPredictions(jobId);
      console.log('[ANALYZE] Raw predictions structure:', JSON.stringify(predictions, null, 2));

      // Process prosody results
      const emotions = [];
      let totalFrames = 0;

      if (Array.isArray(predictions) && predictions.length > 0) {
        // Aggregate across all files, groups, and frames
        const emotionMap = new Map();

        predictions.forEach(fileResult => {
          const filePredictions = fileResult.results?.predictions || [];

          filePredictions.forEach(pred => {
            const prosody = pred.models?.prosody;
            if (!prosody) return;

            const grouped = prosody.groupedPredictions || prosody.grouped_predictions || [];

            grouped.forEach(group => {
              const frames = group.predictions || [];
              totalFrames += frames.length;

              frames.forEach(frame => {
                if (!frame.emotions) return;

                frame.emotions.forEach(emotion => {
                  const current = emotionMap.get(emotion.name) || { sum: 0, count: 0 };
                  emotionMap.set(emotion.name, {
                    sum: current.sum + emotion.score,
                    count: current.count + 1
                  });
                });
              });
            });
          });
        });

        // Calculate averages and sort by score
        emotionMap.forEach((value, name) => {
          emotions.push({
            name,
            score: value.sum / value.count
          });
        });

        emotions.sort((a, b) => b.score - a.score);
      }

      console.log(`[ANALYZE] Found ${emotions.length} emotions (totalFrames=${totalFrames})`);
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      res.json({
        success: true,
        emotions: emotions.slice(0, 48), // Return top 48 emotions
        totalFrames
      });

    } catch (analysisError) {
      // Clean up temp file in case of error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw analysisError;
    }

  } catch (error) {
    console.error('[ANALYZE] Error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze audio',
      details: error.message 
    });
  }
});

/**
 * POST /api/transcribe
 * Proxy to Python service for Whisper transcription
 */
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`[TRANSCRIBE] Proxying to Python service: ${req.file.originalname}`);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('audio', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const response = await fetch('http://localhost:5001/transcribe', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Transcription failed');
    }

    const data = await response.json();
    console.log(`[TRANSCRIBE] Success: ${data.language} detected`);
    res.json(data);

  } catch (error) {
    console.error('[TRANSCRIBE] Error:', error);
    res.status(500).json({ 
      error: 'Transcription failed',
      details: error.message 
    });
  }
});

/**
 * POST /api/diarize
 * Proxy to Python service for speaker diarization
 */
app.post('/api/diarize', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`[DIARIZE] Proxying to Python service: ${req.file.originalname}`);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('audio', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const response = await fetch('http://localhost:5001/diarize', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Diarization failed');
    }

    const data = await response.json();
    console.log(`[DIARIZE] Success: ${data.num_speakers} speakers found`);
    res.json(data);

  } catch (error) {
    console.error('[DIARIZE] Error:', error);
    res.status(500).json({ 
      error: 'Diarization failed',
      details: error.message 
    });
  }
});

/**
 * POST /api/analyze-full
 * Full analysis: Whisper transcription + pyannote diarization + Hume emotion analysis
 */
app.post('/api/analyze-full', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`[ANALYZE-FULL] Starting full analysis: ${req.file.originalname}`);

    // Save to temp file first
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const tempFilePath = path.join(tempDir, `analyze-${Date.now()}-${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('audio', fs.createReadStream(tempFilePath), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // Call Python service for Whisper + pyannote using axios
    const pythonResponse = await axios.post('http://localhost:5001/analyze-full', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    const pythonData = pythonResponse.data;
    console.log(`[ANALYZE-FULL] Python service complete`);

    // Also run Hume emotion analysis
    let humeData = null;
    try {
      // Create temp file for Hume
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      const tempFilePath = path.join(tempDir, `full-${Date.now()}-${req.file.originalname}`);
      fs.writeFileSync(tempFilePath, req.file.buffer);

      const models = { prosody: {} };
      const job = await humeClient.expressionMeasurement.batch.startInferenceJobFromLocalFile({
        file: [fs.createReadStream(tempFilePath)],
        json: { models }
      });

      // Poll for completion
      let status = 'QUEUED';
      let attempts = 0;
      const maxAttempts = 60;
      
      while (status !== 'COMPLETED' && status !== 'FAILED' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const jobDetails = await humeClient.expressionMeasurement.batch.getJobDetails(job.jobId);
        status = jobDetails.state.status;
        attempts++;
        
        if (status === 'FAILED') {
          throw new Error('Hume job failed');
        }
      }

      if (status === 'COMPLETED') {
        const predictions = await humeClient.expressionMeasurement.batch.getJobPredictions(job.jobId);
        
        // Process emotions
        const emotions = [];
        let totalFrames = 0;
        const emotionMap = new Map();

        if (Array.isArray(predictions) && predictions.length > 0) {
          predictions.forEach(fileResult => {
            const filePredictions = fileResult.results?.predictions || [];
            filePredictions.forEach(pred => {
              const prosody = pred.models?.prosody;
              if (!prosody) return;
              const grouped = prosody.groupedPredictions || prosody.grouped_predictions || [];
              grouped.forEach(group => {
                const frames = group.predictions || [];
                totalFrames += frames.length;
                frames.forEach(frame => {
                  if (!frame.emotions) return;
                  frame.emotions.forEach(emotion => {
                    const current = emotionMap.get(emotion.name) || { sum: 0, count: 0 };
                    emotionMap.set(emotion.name, {
                      sum: current.sum + emotion.score,
                      count: current.count + 1
                    });
                  });
                });
              });
            });
          });

          emotionMap.forEach((value, name) => {
            emotions.push({ name, score: value.sum / value.count });
          });
          emotions.sort((a, b) => b.score - a.score);
        }

        humeData = {
          emotions: emotions.slice(0, 48),
          totalFrames
        };

        console.log(`[ANALYZE-FULL] Hume complete: ${emotions.length} emotions`);
      }

      // Clean up
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (humeError) {
      console.error('[ANALYZE-FULL] Hume error (continuing):', humeError.message);
    }

    // Combine results
    const result = {
      success: true,
      transcription: pythonData.transcription,
      diarization: pythonData.diarization,
      emotion_analysis: humeData
    };

    console.log(`[ANALYZE-FULL] Complete!`);
    res.json(result);

  } catch (error) {
    console.error('[ANALYZE-FULL] Error:', error);
    res.status(500).json({ 
      error: 'Full analysis failed',
      details: error.message 
    });
  }
});

// Health check endpoint (includes Python service status)
app.get('/health', async (req, res) => {
  let pythonService = { reachable: false };
  try {
    const { data } = await axios.get('http://localhost:5001/health', { timeout: 3000 });
    pythonService = {
      reachable: true,
      whisper_loaded: !!data.whisper_loaded,
      diarization_loaded: !!data.diarization_loaded
    };
  } catch (e) {
    // Python service not reachable
  }

  res.json({ 
    status: 'ok',
    apiKeyConfigured: !!process.env.HUME_API_KEY,
    pythonService
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 ClarityTalk API Server running on port ${PORT}`);
  console.log(`📡 TTS endpoint: http://localhost:${PORT}/api/tts`);
  console.log(`🎤 Hume emotion analysis: http://localhost:${PORT}/api/analyze-voice`);
  console.log(`📝 Whisper transcription: http://localhost:${PORT}/api/transcribe`);
  console.log(`👥 Speaker diarization: http://localhost:${PORT}/api/diarize`);
  console.log(`🔬 Full analysis: http://localhost:${PORT}/api/analyze-full`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
  
  if (!process.env.HUME_API_KEY || process.env.HUME_API_KEY === 'your_actual_api_key_here') {
    console.warn('⚠️  WARNING: HUME_API_KEY is not configured. Please set it in server/.env file\n');
  }

  // Probe Python service and log capabilities
  (async () => {
    try {
      const { data } = await axios.get('http://localhost:5001/health', { timeout: 3000 });
      console.log(`🧠 Python service: reachable | Whisper: ${data.whisper_loaded ? '✓' : '✗'} | Diarization: ${data.diarization_loaded ? '✓' : '✗'}`);
      if (!data.diarization_loaded) {
        console.warn('⚠️  Pyannote diarization not available. Set HUGGINGFACE_TOKEN in server/.env and restart the Python service.');
      }
    } catch (err) {
      console.warn('⚠️  Python service not reachable at http://localhost:5001. Start it with ./start_python_service.sh');
    }
  })();
});
