#!/usr/bin/env python3
"""
ClarityTalk Python Service with AssemblyAI
Fast transcription + diarization using AssemblyAI API
"""

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import assemblyai as aai

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
        
        # Return results
        return jsonify({
            'success': True,
            'transcription': {
                'text': transcript.text,
                'language': language,
                'segments': segments
            },
            'diarization': diarization_result,
            'emotion_analysis': None  # Can be added later if needed
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
