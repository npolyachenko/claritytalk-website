#!/usr/bin/env python3
"""
ClarityTalk Python Service with AssemblyAI + GPT Emotions
Fast transcription + diarization using AssemblyAI API
GPT-4o-mini for emotion analysis
"""

import os
import tempfile
import logging
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import assemblyai as aai
from openai import OpenAI

# Load environment
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'), override=False)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize AssemblyAI
api_key = os.getenv('ASSEMBLYAI_API_KEY')
if api_key:
    aai.settings.api_key = api_key
    logger.info("AssemblyAI client initialized")
else:
    logger.error("ASSEMBLYAI_API_KEY not found")

# Initialize OpenAI
openai_key = os.getenv('OPENAI_API_KEY')
openai_client = None
if openai_key:
    openai_client = OpenAI(api_key=openai_key)
    logger.info("OpenAI client initialized")
else:
    logger.error("OPENAI_API_KEY not found")

# Emotion constants (same as iOS app)
EMOTION_NAMES = [
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
]

POSITIVE_EMOTIONS = [
    'Joy', 'Contentment', 'Interest', 'Excitement', 'Admiration',
    'Love', 'Pride', 'Amusement', 'Satisfaction', 'Relief',
    'Gratitude', 'Romance', 'Triumph'
]

NEGATIVE_EMOTIONS = [
    'Anger', 'Annoyance', 'Anxiety', 'Fear', 'Disgust',
    'Sadness', 'Distress', 'Pain', 'Contempt', 'Embarrassment',
    'Shame', 'Horror', 'Disappointment'
]

def analyze_emotions_with_gpt(segments, language='en'):
    """Analyze emotions using GPT-4o-mini (same as iOS app)"""
    if not openai_client or not segments:
        return None

    logger.info(f"[GPT-EMOTIONS] Analyzing {len(segments)} segments...")

    # Build segments for analysis
    segments_for_analysis = []
    for i, seg in enumerate(segments):
        text = seg.get('text', '').strip()
        if text:
            segments_for_analysis.append({
                'id': i,
                'start': round(seg.get('start', 0), 2),
                'end': round(seg.get('end', 0), 2),
                'text': text
            })

    if not segments_for_analysis:
        return None

    system_prompt = f"""You are an expert emotion analyst. Analyze the emotional content of speech transcript segments.

For each segment, identify the top 5-8 most relevant emotions and score them from 0.0 to 1.0.

Use these emotion names (from the standard 48-emotion taxonomy):
{', '.join(EMOTION_NAMES)}

Scoring guidelines:
- 0.7-1.0: Very strong, clearly dominant emotion
- 0.4-0.7: Moderate, clearly present
- 0.1-0.4: Subtle, implied or background emotion
- Only include emotions scoring above 0.05

Return JSON format:
{{
  "segments": [
    {{
      "id": 0,
      "emotions": [
        {{"name": "Interest", "score": 0.65}},
        {{"name": "Calmness", "score": 0.45}}
      ]
    }}
  ]
}}"""

    try:
        # Process in batches of 20
        batch_size = 20
        all_frame_results = []

        for batch_start in range(0, len(segments_for_analysis), batch_size):
            batch = segments_for_analysis[batch_start:batch_start + batch_size]

            lines = [f"Analyze emotions in these speech segments (language: {language}):\n"]
            for seg in batch:
                lines.append(f"[{seg['id']}] ({seg['start']}s - {seg['end']}s): \"{seg['text']}\"")
            user_prompt = '\n'.join(lines)

            response = openai_client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                temperature=0.3,
                response_format={'type': 'json_object'}
            )

            result_text = response.choices[0].message.content
            batch_result = json.loads(result_text)
            all_frame_results.extend(batch_result.get('segments', []))

        # Build results (same format as iOS app)
        timeline = []
        emotion_frames = []
        emotion_aggregates = {}
        total_frames = 0

        seg_map = {s['id']: s for s in segments_for_analysis}

        for gpt_seg in all_frame_results:
            seg_id = gpt_seg.get('id', -1)
            emotions = gpt_seg.get('emotions', [])
            orig = seg_map.get(seg_id)

            if not emotions or not orig:
                continue

            frame_start = orig['start']
            frame_end = orig['end']
            total_frames += 1

            # Pad with zero scores for all 48 emotions
            emotion_scores = {e['name']: e['score'] for e in emotions}
            full_emotions = [{'name': name, 'score': emotion_scores.get(name, 0.0)} for name in EMOTION_NAMES]

            emotion_frames.append({
                'start': frame_start,
                'end': frame_end,
                'emotions': full_emotions
            })

            # Top emotion for timeline
            if emotions:
                top_emotion = max(emotions, key=lambda x: x['score'])
                timeline.append({
                    'emotion': top_emotion['name'],
                    'confidence': top_emotion['score'],
                    'timestamp': frame_start
                })

            # Aggregate scores
            for e in full_emotions:
                name = e['name']
                if name not in emotion_aggregates:
                    emotion_aggregates[name] = {'sum': 0, 'count': 0}
                emotion_aggregates[name]['sum'] += e['score']
                emotion_aggregates[name]['count'] += 1

        # Calculate averages
        all_emotions = []
        for name, data in emotion_aggregates.items():
            avg_score = data['sum'] / data['count'] if data['count'] > 0 else 0
            all_emotions.append({'name': name, 'score': avg_score})
        all_emotions.sort(key=lambda x: x['score'], reverse=True)

        # Calculate emotional tone
        positive_score = sum(e['score'] for e in all_emotions if e['name'] in POSITIVE_EMOTIONS)
        negative_score = sum(e['score'] for e in all_emotions if e['name'] in NEGATIVE_EMOTIONS)

        if positive_score > negative_score and positive_score > 0.3:
            emotional_tone = 'positive'
        elif negative_score > positive_score and negative_score > 0.3:
            emotional_tone = 'negative'
        else:
            emotional_tone = 'neutral'

        logger.info(f"[GPT-EMOTIONS] Complete: {total_frames} segments, tone={emotional_tone}")

        return {
            'timeline': timeline,
            'all_emotions': all_emotions[:48],
            'emotion_frames': emotion_frames,
            'total_frames': total_frames,
            'emotional_tone': emotional_tone,
            # Backwards compatibility
            'emotions': all_emotions[:48],
            'emotionFrames': emotion_frames,
            'totalFrames': total_frames
        }

    except Exception as e:
        logger.error(f"[GPT-EMOTIONS] Error: {e}")
        return None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'assemblyai_configured': bool(api_key),
        'service': 'assemblyai'
    })

@app.route('/analyze-full', methods=['POST'])
def analyze_full():
    """
    Full analysis using AssemblyAI: transcription + speaker diarization
    Returns: {transcription, diarization, emotion_analysis}
    """
    try:
        if not api_key:
            return jsonify({'error': 'AssemblyAI not configured'}), 503
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file
        suffix = os.path.splitext(audio_file.filename or '.wav')[1] or '.wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Full analysis for: {audio_file.filename}")
        
        # Configure AssemblyAI transcriber with speaker labels
        config = aai.TranscriptionConfig(
            speaker_labels=True,  # Enable speaker diarization
            language_detection=True  # Auto-detect language
        )
        
        transcriber = aai.Transcriber()
        
        # Transcribe with diarization
        logger.info("Starting AssemblyAI transcription + diarization...")
        transcript = transcriber.transcribe(temp_path, config=config)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        if transcript.status == aai.TranscriptStatus.error:
            logger.error(f"AssemblyAI error: {transcript.error}")
            return jsonify({
                'error': 'Transcription failed',
                'details': transcript.error
            }), 500
        
        logger.info(f"Transcription complete: {len(transcript.text)} chars")
        
        # Build speaker mapping (A->0, B->1, etc.)
        speaker_map = {}
        if transcript.utterances:
            unique_speakers = sorted(set(u.speaker for u in transcript.utterances))
            speaker_map = {spk: f'SPEAKER_{i}' for i, spk in enumerate(unique_speakers)}
        
        # Build segments with speaker labels
        segments = []
        if transcript.utterances:
            for utterance in transcript.utterances:
                segments.append({
                    'start': utterance.start / 1000.0,  # Convert ms to seconds
                    'end': utterance.end / 1000.0,
                    'text': utterance.text,
                    'speaker': speaker_map.get(utterance.speaker, 'SPEAKER_0')
                })
        
        # Build diarization data
        diarization_result = None
        if transcript.utterances:
            speakers = set()
            turns = []
            
            for utterance in transcript.utterances:
                speaker = speaker_map.get(utterance.speaker, 'SPEAKER_0')
                speakers.add(speaker)
                turns.append({
                    'speaker': speaker,
                    'start': utterance.start / 1000.0,
                    'end': utterance.end / 1000.0,
                    'duration': (utterance.end - utterance.start) / 1000.0
                })
            
            # Calculate speaker stats
            speaker_stats = {}
            total_words = len(transcript.text.split())
            
            for spk in sorted(speakers):
                spk_turns = [t for t in turns if t['speaker'] == spk]
                spk_duration = sum(t['duration'] for t in spk_turns)
                spk_segments = [s for s in segments if s.get('speaker') == spk]
                spk_words = sum(len(s['text'].split()) for s in spk_segments)
                
                speaker_stats[spk] = {
                    'duration': round(spk_duration, 2),
                    'turns': len(spk_turns),
                    'words': spk_words,
                    'percentage': round(spk_words / total_words * 100) if total_words > 0 else 0
                }
            
            diarization_result = {
                'speakers': sorted(list(speakers)),
                'turns': turns,
                'num_speakers': len(speakers),
                'speaker_stats': speaker_stats
            }
            logger.info(f"✓ Diarization: {len(speakers)} speakers, {len(turns)} turns")
        
        # Get language code from AssemblyAI
        language = None
        
        # Check json_response for language info
        if hasattr(transcript, 'json_response') and transcript.json_response:
            json_data = transcript.json_response
            logger.info(f"JSON response keys: {list(json_data.keys()) if isinstance(json_data, dict) else 'not a dict'}")
            if isinstance(json_data, dict):
                language = json_data.get('language_code') or json_data.get('language_detected')
                logger.info(f"Language from json_response: {language}")
        
        # Fallback to direct attributes
        if not language and hasattr(transcript, 'language_code') and transcript.language_code:
            language = transcript.language_code
        
        logger.info(f"Final language: {language}")
        
        # Run GPT emotion analysis
        emotion_result = None
        if segments:
            emotion_result = analyze_emotions_with_gpt(segments, language or 'en')

        # Return results
        return jsonify({
            'success': True,
            'transcription': {
                'text': transcript.text,
                'language': language,
                'segments': segments
            },
            'diarization': diarization_result,
            'emotion_analysis': emotion_result
        })
    
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({
            'error': 'Analysis failed',
            'details': str(e)
        }), 500

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Simple transcription endpoint (for backwards compatibility)
    """
    try:
        if not api_key:
            return jsonify({'error': 'AssemblyAI not configured'}), 503
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file
        suffix = os.path.splitext(audio_file.filename or '.wav')[1] or '.wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Transcribing: {audio_file.filename}")
        
        # Configure
        config = aai.TranscriptionConfig(language_detection=True)
        transcriber = aai.Transcriber()
        
        # Transcribe
        transcript = transcriber.transcribe(temp_path, config=config)
        
        # Clean up
        os.unlink(temp_path)
        
        if transcript.status == aai.TranscriptStatus.error:
            return jsonify({'error': transcript.error}), 500
        
        return jsonify({
            'success': True,
            'text': transcript.text,
            'language': transcript.language_code if hasattr(transcript, 'language_code') else None
        })
    
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting ClarityTalk Python Service (AssemblyAI)...")
    
    port = int(os.getenv('PYTHON_PORT', os.getenv('PORT', 5001)))
    
    logger.info("=" * 60)
    logger.info("ClarityTalk Python Service (AssemblyAI)")
    logger.info("=" * 60)
    logger.info(f"Running on port: {port}")
    logger.info(f"AssemblyAI: {'Configured' if api_key else 'Not configured'}")
    logger.info("=" * 60)
    
    app.run(host='0.0.0.0', port=port, debug=False)
