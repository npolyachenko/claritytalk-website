const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { HumeClient } = require('hume');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'https://claritytalk-website-1.onrender.com';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// OpenAI Whisper transcription function
async function transcribeWithOpenAI(audioBuffer, filename) {
  console.log('[OPENAI-WHISPER] Starting transcription...');
  
  // Create a temporary file
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const tempPath = path.join(tempDir, `whisper-${Date.now()}-${filename}`);
  fs.writeFileSync(tempPath, audioBuffer);
  
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json'
    });
    
    console.log('[OPENAI-WHISPER] Transcription complete');
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    return transcription;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw error;
  }
}

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

    const response = await fetch(PYTHON_SERVICE_URL + '/transcribe', {
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

    // Save to temp file (required for form-data to work with Flask)
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const tempPath = path.join(tempDir, `diarize-${Date.now()}-${req.file.originalname}`);
    fs.writeFileSync(tempPath, req.file.buffer);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('audio', fs.createReadStream(tempPath), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const response = await axios.post(PYTHON_SERVICE_URL + '/diarize', form, {
      headers: form.getHeaders(),
      timeout: 300000 // 5 minute timeout for long audio
    });

    // Clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    console.log(`[DIARIZE] Success: ${response.data.num_speakers} speakers found`);
    res.json(response.data);

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
 * Full analysis: OpenAI Whisper transcription + Hume emotion analysis
 */
app.post('/api/analyze-full', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`[ANALYZE-FULL] Starting full analysis: ${req.file.originalname}`);

    // 1. Call Python service for transcription + diarization
    let transcriptionData = null;
    let diarizationData = null;
    
    try {
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const pythonTempPath = path.join(tempDir, `python-${Date.now()}-${req.file.originalname}`);
      fs.writeFileSync(pythonTempPath, req.file.buffer);
      
      const FormData = require('form-data');
      const form = new FormData();
      form.append('audio', fs.createReadStream(pythonTempPath), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      
      console.log('[ANALYZE-FULL] Calling Python service /analyze-full...');
      const pythonResponse = await axios.post(PYTHON_SERVICE_URL + '/analyze-full', form, {
        headers: form.getHeaders(),
        timeout: 600000 // 10 minutes for diarization
      });
      
      // Clean up temp file
      if (fs.existsSync(pythonTempPath)) {
        fs.unlinkSync(pythonTempPath);
      }
      
      if (pythonResponse.data && pythonResponse.data.transcription) {
        transcriptionData = pythonResponse.data.transcription;
        diarizationData = pythonResponse.data.diarization;
        console.log(`[ANALYZE-FULL] Python service complete: ${transcriptionData.language || 'unknown'} language`);
        if (diarizationData) {
          console.log(`[ANALYZE-FULL] Diarization: ${diarizationData.num_speakers} speakers`);
        }
      }
    } catch (pythonError) {
      console.error('[ANALYZE-FULL] Python service error:', pythonError.message);
      // Fallback to direct OpenAI
      try {
        const result = await transcribeWithOpenAI(req.file.buffer, req.file.originalname);
        transcriptionData = {
          text: result.text,
          language: result.language,
          segments: result.segments
        };
        console.log(`[ANALYZE-FULL] Fallback OpenAI transcription complete: ${result.language}`);
      } catch (openaiError) {
        console.error('[ANALYZE-FULL] OpenAI fallback error:', openaiError.message);
        transcriptionData = { text: '', error: openaiError.message };
      }
    }

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

      // Poll for completion (20 minutes max for free tier queue)
      let status = 'QUEUED';
      let attempts = 0;
      const maxAttempts = 600; // 600 × 2s = 20 minutes
      
      while (status !== 'COMPLETED' && status !== 'FAILED' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const jobDetails = await humeClient.expressionMeasurement.batch.getJobDetails(job.jobId);
        status = jobDetails.state.status;
        attempts++;
        
        if (attempts % 30 === 0) {
          console.log(`[HUME] Waiting... status: ${status}, ${Math.round(attempts * 2 / 60)}min elapsed`);
        }
        
        if (status === 'FAILED') {
          throw new Error('Hume job failed');
        }
      }

      if (status === 'COMPLETED') {
        const predictions = await humeClient.expressionMeasurement.batch.getJobPredictions(job.jobId);
        
        // Process emotions
        const emotions = [];
        const emotionFrames = []; // Store frames with timestamps
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
                  
                  // Store frame with timestamp
                  const timeStart = frame.time?.begin || 0;
                  const timeEnd = frame.time?.end || timeStart;
                  emotionFrames.push({
                    start: timeStart,
                    end: timeEnd,
                    emotions: frame.emotions.map(e => ({ name: e.name, score: e.score }))
                  });
                  
                  // Also compute overall averages
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
          emotionFrames, // Include frames with timestamps
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

    // Diarization is already handled by Python service /analyze-full endpoint above

    // Combine results
    const result = {
      success: true,
      transcription: transcriptionData,
      diarization: diarizationData,
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

/**
 * POST /api/generate-text-analysis
 * Generate speaker analysis and recommendations in the detected language using OpenAI
 * Body: { language: string, diarization: object, emotions: array }
 */
app.post('/api/generate-text-analysis', async (req, res) => {
  try {
    const { language, diarization, emotions } = req.body;
    
    if (!diarization || !emotions) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    
    console.log(`[TEXT-ANALYSIS] Generating analysis in language: ${language || 'English'}`);
    
    // Detect language name from code
    const languageMap = {
      'ru': 'Russian',
      'Russian': 'Russian',
      'en': 'English',
      'English': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German'
    };
    const targetLanguage = languageMap[language] || 'English';
    
    // Build context about the conversation
    const speakers = diarization.speakers || [];
    const speakerStats = diarization.speaker_stats || {};
    const topEmotions = emotions.slice(0, 5).map(e => `${e.name} (${(e.score * 100).toFixed(0)}%)`).join(', ');
    
    let speakerContext = '';
    speakers.forEach(speaker => {
      const stats = speakerStats[speaker] || {};
      const num = parseInt(speaker.replace('SPEAKER_', '')) + 1;
      speakerContext += `\nSpeaker ${num}: ${stats.percentage || 0}% of words, ${stats.words || 0} words total`;
    });
    
    const prompt = `You are an expert communication coach analyzing a conversation.

Conversation data:
- Language: ${targetLanguage}
- Number of speakers: ${speakers.length}
- Top emotions detected: ${topEmotions}
${speakerContext}

Generate a JSON response in ${targetLanguage} with the following structure:
{
  "speaker_insights": [
    {
      "speaker": "Speaker 1",
      "title": "Brief insight title",
      "text": "Detailed analysis and recommendation (2-3 sentences)",
      "type": "balance|pace|volume|positive"
    }
  ],
  "emotion_insights": [
    {
      "title": "Emotion-based insight title",
      "text": "Detailed analysis and recommendation (2-3 sentences)",
      "type": "emotion"
    }
  ],
  "general_tips": [
    {
      "title": "General communication tip",
      "text": "Actionable advice (1-2 sentences)",
      "type": "general"
    }
  ]
}

Guidelines:
- Provide 1-3 speaker-specific insights based on speaking balance, pace, or volume
- Provide 2-3 emotion-based insights from the top detected emotions
- Provide 1-2 general communication tips
- Use appropriate emojis in titles (🗣️, ⚡, 🔊, ✓, etc.)
- Be specific, actionable, and constructive
- Write ENTIRELY in ${targetLanguage}
- Return ONLY valid JSON, no markdown formatting`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional communication coach. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });
    
    const analysis = JSON.parse(completion.choices[0].message.content);
    console.log('[TEXT-ANALYSIS] Generated successfully');
    
    res.json({
      success: true,
      analysis
    });
    
  } catch (error) {
    console.error('[TEXT-ANALYSIS] Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate analysis',
      details: error.message 
    });
  }
});

/**
 * POST /api/generate-emotion-summary
 * Generate emotion analysis summary in the detected language using OpenAI
 * Body: { language: string, emotions: array }
 */
app.post('/api/generate-emotion-summary', async (req, res) => {
  try {
    const { language, emotions } = req.body;
    
    if (!emotions || emotions.length === 0) {
      return res.status(400).json({ error: 'Missing emotions data' });
    }
    
    console.log(`[EMOTION-SUMMARY] Generating summary in language: ${language || 'English'}`);
    
    const languageMap = {
      'ru': 'Russian',
      'Russian': 'Russian',
      'en': 'English',
      'English': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German'
    };
    const targetLanguage = languageMap[language] || 'English';
    
    const top3 = emotions.slice(0, 3);
    const emotionsList = top3.map(e => `${e.name} (${(e.score * 100).toFixed(0)}%)`).join(', ');
    
    const prompt = `You are analyzing emotional content in a voice conversation.

Top emotions detected: ${emotionsList}

Write a 2-3 sentence summary in ${targetLanguage} that:
1. Describes the primary emotional tone
2. Explains what this emotional combination suggests about the communication style
3. Mentions any notable secondary emotions

Be professional, insightful, and specific. Write in a natural, flowing style.
Respond with ONLY the summary text, no JSON, no formatting.`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are a voice emotion analyst. Write concise, professional summaries in ${targetLanguage}.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200
    });
    
    const summary = completion.choices[0].message.content.trim();
    console.log('[EMOTION-SUMMARY] Generated successfully');
    
    res.json({
      success: true,
      summary
    });
    
  } catch (error) {
    console.error('[EMOTION-SUMMARY] Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'ok',
    apiKeyConfigured: !!process.env.HUME_API_KEY,
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 ClarityTalk API Server running on port ${PORT}`);
  console.log(`📡 TTS endpoint: http://localhost:${PORT}/api/tts`);
  console.log(`🎤 Hume emotion analysis: http://localhost:${PORT}/api/analyze-voice`);
  console.log(`🔬 Full analysis: http://localhost:${PORT}/api/analyze-full`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
  
  if (!process.env.HUME_API_KEY) {
    console.warn('⚠️  WARNING: HUME_API_KEY is not configured\n');
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY is not configured (needed for transcription)\n');
  }
});
