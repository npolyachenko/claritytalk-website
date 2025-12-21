#!/usr/bin/env python3
"""
ClarityTalk Python Service
Handles:
- Speech-to-text transcription (OpenAI Whisper API)
- Speaker diarization (pyannote.audio)
"""

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

# Pyannote for speaker diarization
try:
    from pyannote.audio import Pipeline
    PYANNOTE_AVAILABLE = True
except ImportError:
    PYANNOTE_AVAILABLE = False

# Load environment from .env if present
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'), override=False)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize OpenAI client
client = None
diarization_pipeline = None

def init_client():
    """Initialize OpenAI client"""
    global client
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return False
    client = OpenAI(api_key=api_key)
    logger.info("OpenAI client initialized successfully")
    return True

def init_diarization():
    """Initialize pyannote diarization pipeline (lazy loading)"""
    global diarization_pipeline
    if not PYANNOTE_AVAILABLE:
        logger.warning("pyannote.audio not available")
        return False
    
    hf_token = os.getenv('HUGGINGFACE_TOKEN')
    if not hf_token:
        logger.warning("HUGGINGFACE_TOKEN not found - diarization disabled")
        return False
    
    try:
        logger.info("Loading pyannote diarization pipeline...")
        diarization_pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )
        logger.info("✓ Diarization pipeline loaded")
        return True
    except Exception as e:
        logger.error(f"Failed to load diarization pipeline: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'openai_configured': client is not None,
        'diarization_available': PYANNOTE_AVAILABLE,
        'diarization_loaded': diarization_pipeline is not None
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio using OpenAI Whisper API
    Returns: { text, language, segments[] }
    """
    try:
        if not client:
            return jsonify({'error': 'OpenAI client not configured'}), 503
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Get optional language parameter
        language = request.form.get('language', None)
        
        # Save to temporary file
        suffix = os.path.splitext(audio_file.filename or '.wav')[1] or '.wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Transcribing audio file: {audio_file.filename}")
        
        # Transcribe with OpenAI Whisper API
        with open(temp_path, 'rb') as audio:
            kwargs = {
                'model': 'whisper-1',
                'file': audio,
                'response_format': 'verbose_json'
            }
            if language:
                kwargs['language'] = language
            
            result = client.audio.transcriptions.create(**kwargs)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        logger.info(f"Transcription complete: {len(result.text)} chars")
        
        # Format segments if available
        segments = []
        if hasattr(result, 'segments') and result.segments:
            for seg in result.segments:
                segments.append({
                    'start': seg['start'] if isinstance(seg, dict) else seg.start,
                    'end': seg['end'] if isinstance(seg, dict) else seg.end,
                    'text': seg['text'] if isinstance(seg, dict) else seg.text
                })
        
        return jsonify({
            'success': True,
            'text': result.text,
            'language': getattr(result, 'language', None),
            'segments': segments
        })
    
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return jsonify({
            'error': 'Transcription failed',
            'details': str(e)
        }), 500

@app.route('/diarize', methods=['POST'])
def diarize():
    """
    Speaker diarization using pyannote.audio
    Returns: { speakers[], turns[], num_speakers }
    """
    global diarization_pipeline
    
    try:
        if not PYANNOTE_AVAILABLE:
            return jsonify({'error': 'pyannote not available'}), 503
        
        # Lazy load diarization pipeline
        if diarization_pipeline is None:
            if not init_diarization():
                return jsonify({'error': 'Diarization pipeline not available'}), 503
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file (WAV format works best)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Diarizing: {audio_file.filename}")
        
        # Run diarization
        diarization = diarization_pipeline(temp_path)
        
        # Clean up
        os.unlink(temp_path)
        
        # Process results
        speakers = set()
        turns = []
        
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speakers.add(speaker)
            turns.append({
                'speaker': speaker,
                'start': round(turn.start, 2),
                'end': round(turn.end, 2),
                'duration': round(turn.end - turn.start, 2)
            })
        
        logger.info(f"✓ Diarization complete: {len(speakers)} speakers, {len(turns)} turns")
        
        return jsonify({
            'success': True,
            'speakers': sorted(list(speakers)),
            'turns': turns,
            'num_speakers': len(speakers)
        })
    
    except Exception as e:
        logger.error(f"Diarization error: {e}")
        return jsonify({
            'error': 'Diarization failed',
            'details': str(e)
        }), 500

@app.route('/analyze-full', methods=['POST'])
def analyze_full():
    """
    Full analysis: transcription + diarization
    Returns format expected by frontend
    """
    global diarization_pipeline
    
    try:
        if not client:
            return jsonify({'error': 'OpenAI client not configured'}), 503
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file
        suffix = os.path.splitext(audio_file.filename or '.wav')[1] or '.wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Full analysis for: {audio_file.filename}")
        
        # 1. Transcribe with OpenAI Whisper API
        with open(temp_path, 'rb') as audio:
            result = client.audio.transcriptions.create(
                model='whisper-1',
                file=audio,
                response_format='verbose_json'
            )
        
        logger.info(f"Transcription complete: {len(result.text)} chars")
        
        # Format segments
        segments = []
        if hasattr(result, 'segments') and result.segments:
            for seg in result.segments:
                segments.append({
                    'start': seg['start'] if isinstance(seg, dict) else seg.start,
                    'end': seg['end'] if isinstance(seg, dict) else seg.end,
                    'text': seg['text'] if isinstance(seg, dict) else seg.text
                })
        
        # 2. Diarization (if available)
        diarization_result = None
        if PYANNOTE_AVAILABLE:
            try:
                # Lazy load
                if diarization_pipeline is None:
                    init_diarization()
                
                if diarization_pipeline is not None:
                    logger.info("Running diarization...")
                    diarization = diarization_pipeline(temp_path)
                    
                    speakers = set()
                    turns = []
                    
                    for turn, _, speaker in diarization.itertracks(yield_label=True):
                        speakers.add(speaker)
                        turns.append({
                            'speaker': speaker,
                            'start': round(turn.start, 2),
                            'end': round(turn.end, 2),
                            'duration': round(turn.end - turn.start, 2)
                        })
                    
                    diarization_result = {
                        'speakers': sorted(list(speakers)),
                        'turns': turns,
                        'num_speakers': len(speakers)
                    }
                    logger.info(f"✓ Diarization: {len(speakers)} speakers")
            except Exception as e:
                logger.error(f"Diarization error (continuing): {e}")
        
        # Clean up temp file
        os.unlink(temp_path)
        
        # Return in format expected by frontend
        return jsonify({
            'success': True,
            'transcription': {
                'text': result.text,
                'language': getattr(result, 'language', None),
                'segments': segments
            },
            'diarization': diarization_result,
            'emotion_analysis': None
        })
    
    except Exception as e:
        logger.error(f"Full analysis error: {e}")
        return jsonify({
            'error': 'Analysis failed',
            'details': str(e)
        }), 500

# Initialize client on module load for gunicorn
init_client()

if __name__ == '__main__':
    logger.info("Starting ClarityTalk Python Service...")
    
    port = int(os.getenv('PORT', 5001))
    
    logger.info("=" * 60)
    logger.info("ClarityTalk Python Service (OpenAI Whisper API)")
    logger.info("=" * 60)
    logger.info(f"Running on port: {port}")
    logger.info(f"OpenAI API: {'Configured' if client else 'Not configured'}")
    logger.info("=" * 60)
    
    app.run(host='0.0.0.0', port=port, debug=False)
