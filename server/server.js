const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { HumeClient } = require('hume'); // For TTS only
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

// Initialize Hume AI client (for TTS only)
const humeClient = new HumeClient({
  apiKey: process.env.HUME_API_KEY
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

// All 48 emotions from Hume AI taxonomy (kept for compatibility)
const EMOTION_NAMES = [
  'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
  'Annoyance', 'Anxiety', 'Awe', 'Awkwardness', 'Boredom',
  'Calmness', 'Concentration', 'Confusion', 'Contemplation', 'Contempt',
  'Contentment', 'Craving', 'Desire', 'Determination', 'Disappointment',
  'Disapproval', 'Disgust', 'Distress', 'Doubt', 'Ecstasy',
  'Embarrassment', 'Empathic Pain', 'Enthusiasm', 'Entrancement', 'Envy',
  'Excitement', 'Fear', 'Gratitude', 'Guilt', 'Horror',
  'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain',
  'Pride', 'Realization', 'Relief', 'Romance', 'Sadness',
  'Satisfaction', 'Shame', 'Surprise (positive)', 'Surprise (negative)', 'Sympathy',
  'Tiredness', 'Triumph'
];

const POSITIVE_EMOTIONS = [
  'Joy', 'Contentment', 'Interest', 'Excitement', 'Admiration',
  'Love', 'Pride', 'Amusement', 'Satisfaction', 'Relief',
  'Gratitude', 'Romance', 'Triumph'
];

const NEGATIVE_EMOTIONS = [
  'Anger', 'Annoyance', 'Anxiety', 'Fear', 'Disgust',
  'Sadness', 'Distress', 'Pain', 'Contempt', 'Embarrassment',
  'Shame', 'Horror', 'Disappointment'
];

// GPT-based emotion analysis (same as iOS app)
async function analyzeEmotionsWithGPT(transcriptData) {
  console.log('[GPT-EMOTIONS] Starting emotion analysis...');

  if (!transcriptData || !transcriptData.segments || transcriptData.segments.length === 0) {
    console.log('[GPT-EMOTIONS] No segments to analyze');
    return { timeline: [], all_emotions: [], emotion_frames: [], total_frames: 0, emotional_tone: 'neutral' };
  }

  const segments = transcriptData.segments;
  const language = transcriptData.language || 'en';

  // Build segments for analysis
  const segmentsForAnalysis = segments
    .map((seg, i) => ({
      id: i,
      start: Math.round((seg.start || 0) * 100) / 100,
      end: Math.round((seg.end || seg.start || 0) * 100) / 100,
      text: (seg.text || '').trim()
    }))
    .filter(seg => seg.text);

  if (segmentsForAnalysis.length === 0) {
    return { timeline: [], all_emotions: [], emotion_frames: [], total_frames: 0, emotional_tone: 'neutral' };
  }

  const systemPrompt = `You are an expert emotion analyst. Analyze the emotional content of speech transcript segments.

For each segment, identify the top 5-8 most relevant emotions and score them from 0.0 to 1.0.

Use these emotion names (from the standard 48-emotion taxonomy):
${EMOTION_NAMES.join(', ')}

Scoring guidelines:
- 0.7-1.0: Very strong, clearly dominant emotion
- 0.4-0.7: Moderate, clearly present
- 0.1-0.4: Subtle, implied or background emotion
- Only include emotions scoring above 0.05

Return JSON format:
{
  "segments": [
    {
      "id": 0,
      "emotions": [
        {"name": "Interest", "score": 0.65},
        {"name": "Calmness", "score": 0.45}
      ]
    }
  ]
}`;

  try {
    // Process in batches of 20 segments
    const batchSize = 20;
    const allFrameResults = [];

    for (let batchStart = 0; batchStart < segmentsForAnalysis.length; batchStart += batchSize) {
      const batch = segmentsForAnalysis.slice(batchStart, batchStart + batchSize);

      const lines = [`Analyze emotions in these speech segments (language: ${language}):\n`];
      batch.forEach(seg => {
        lines.push(`[${seg.id}] (${seg.start}s - ${seg.end}s): "${seg.text}"`);
      });
      const userPrompt = lines.join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const resultText = response.choices[0].message.content;
      const batchResult = JSON.parse(resultText);
      allFrameResults.push(...(batchResult.segments || []));
    }

    // Build results in the same format as iOS app
    const timeline = [];
    const emotionFrames = [];
    const emotionAggregates = {};
    let totalFrames = 0;

    // Map original segments by ID
    const segMap = {};
    segmentsForAnalysis.forEach(s => { segMap[s.id] = s; });

    allFrameResults.forEach(gptSeg => {
      const segId = gptSeg.id;
      const emotions = gptSeg.emotions || [];
      const orig = segMap[segId];

      if (!emotions.length || !orig) return;

      const frameStart = orig.start;
      const frameEnd = orig.end;
      totalFrames++;

      // Pad with zero scores for all 48 emotions
      const emotionScores = {};
      emotions.forEach(e => { emotionScores[e.name] = e.score; });

      const fullEmotions = EMOTION_NAMES.map(name => ({
        name,
        score: emotionScores[name] || 0.0
      }));

      emotionFrames.push({
        start: frameStart,
        end: frameEnd,
        emotions: fullEmotions
      });

      // Top emotion for timeline
      if (emotions.length > 0) {
        const topEmotion = emotions.reduce((a, b) => a.score > b.score ? a : b);
        timeline.push({
          emotion: topEmotion.name,
          confidence: topEmotion.score,
          timestamp: frameStart
        });
      }

      // Aggregate scores
      fullEmotions.forEach(e => {
        if (!emotionAggregates[e.name]) {
          emotionAggregates[e.name] = { sum: 0, count: 0 };
        }
        emotionAggregates[e.name].sum += e.score;
        emotionAggregates[e.name].count++;
      });
    });

    // Calculate averages
    const allEmotions = [];
    Object.entries(emotionAggregates).forEach(([name, data]) => {
      const avgScore = data.count > 0 ? data.sum / data.count : 0;
      allEmotions.push({ name, score: avgScore });
    });
    allEmotions.sort((a, b) => b.score - a.score);

    // Calculate emotional tone
    const positiveScore = allEmotions
      .filter(e => POSITIVE_EMOTIONS.includes(e.name))
      .reduce((sum, e) => sum + e.score, 0);
    const negativeScore = allEmotions
      .filter(e => NEGATIVE_EMOTIONS.includes(e.name))
      .reduce((sum, e) => sum + e.score, 0);

    let emotionalTone = 'neutral';
    if (positiveScore > negativeScore && positiveScore > 0.3) {
      emotionalTone = 'positive';
    } else if (negativeScore > positiveScore && negativeScore > 0.3) {
      emotionalTone = 'negative';
    }

    console.log(`[GPT-EMOTIONS] Analysis complete: ${totalFrames} segments, tone=${emotionalTone}`);

    return {
      timeline,
      all_emotions: allEmotions.slice(0, 48),
      emotion_frames: emotionFrames,
      total_frames: totalFrames,
      emotional_tone: emotionalTone,
      // Also include old format for backwards compatibility
      emotions: allEmotions.slice(0, 48),
      emotionFrames,
      totalFrames
    };

  } catch (error) {
    console.error('[GPT-EMOTIONS] Error:', error.message);
    return { timeline: [], all_emotions: [], emotion_frames: [], total_frames: 0, emotional_tone: 'neutral', error: error.message };
  }
}

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
 * Analyze audio file for emotional characteristics using GPT
 * Form-data: audio file
 */
app.post('/api/analyze-voice', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`[ANALYZE] Analyzing audio file: ${req.file.originalname}`);
    console.log(`[ANALYZE] File size: ${(req.file.size / 1024).toFixed(2)} KB`);

    // Step 1: Transcribe with Whisper
    console.log('[ANALYZE] Transcribing with Whisper...');
    const transcription = await transcribeWithOpenAI(req.file.buffer, req.file.originalname);

    const transcriptData = {
      text: transcription.text,
      language: transcription.language,
      segments: transcription.segments
    };

    // Step 2: Analyze emotions with GPT
    console.log('[ANALYZE] Analyzing emotions with GPT...');
    const emotionResult = await analyzeEmotionsWithGPT(transcriptData);

    console.log(`[ANALYZE] Found ${emotionResult.emotions?.length || 0} emotions`);

    res.json({
      success: true,
      emotions: emotionResult.emotions || [],
      totalFrames: emotionResult.totalFrames || 0
    });

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
 * Full analysis: OpenAI Whisper transcription + GPT emotion analysis
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

    // Run GPT-based emotion analysis (fast, uses transcript text)
    let emotionData = null;
    try {
      if (transcriptionData && transcriptionData.segments) {
        emotionData = await analyzeEmotionsWithGPT(transcriptionData);
        console.log(`[ANALYZE-FULL] GPT emotions complete: ${emotionData.emotions?.length || 0} emotions`);
      }
    } catch (emotionError) {
      console.error('[ANALYZE-FULL] GPT emotion error (continuing):', emotionError.message);
    }

    // Combine results
    const result = {
      success: true,
      transcription: transcriptionData,
      diarization: diarizationData,
      emotion_analysis: emotionData
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
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    humeTtsConfigured: !!process.env.HUME_API_KEY
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 ClarityTalk API Server running on port ${PORT}`);
  console.log(`📡 TTS endpoint: http://localhost:${PORT}/api/tts`);
  console.log(`🎤 GPT emotion analysis: http://localhost:${PORT}/api/analyze-voice`);
  console.log(`🔬 Full analysis: http://localhost:${PORT}/api/analyze-full`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);

  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY is not configured (needed for transcription & emotions)\n');
  }
  if (!process.env.HUME_API_KEY) {
    console.warn('⚠️  WARNING: HUME_API_KEY is not configured (needed for TTS only)\n');
  }
});
