#!/usr/bin/env python3
"""
ClarityTalk Python Service
Handles speech-to-text transcription and speaker diarization
"""

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
from pyannote.audio import Pipeline
import torch
from dotenv import load_dotenv

# Load environment from .env if present
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'), override=False)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Global models (loaded once at startup)
whisper_model = None
diarization_pipeline = None

def load_models():
    """Load ML models at startup"""
    global whisper_model, diarization_pipeline
    
    logger.info("Loading Whisper model...")
    # Use 'base' model for speed, 'medium' or 'large' for better accuracy
    whisper_model = whisper.load_model("base")
    logger.info("Whisper model loaded successfully")
    
    logger.info("Loading pyannote speaker diarization pipeline...")
    try:
        # Requires HuggingFace token for pyannote models
        # Get token from environment or use local models
        hf_token = os.getenv('HUGGINGFACE_TOKEN')
        if hf_token:
            diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
        else:
            logger.warning("No HUGGINGFACE_TOKEN found. Speaker diarization will use fallback.")
            diarization_pipeline = None
    except Exception as e:
        logger.error(f"Failed to load diarization pipeline: {e}")
        diarization_pipeline = None
    
    if diarization_pipeline:
        logger.info("Diarization pipeline loaded successfully")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'whisper_loaded': whisper_model is not None,
        'diarization_loaded': diarization_pipeline is not None
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio using Whisper
    Returns: { text, language, segments[] }
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Transcribing audio file: {audio_file.filename}")
        
        # Transcribe with Whisper (auto-detect language)
        result = whisper_model.transcribe(
            temp_path,
            task='transcribe',
            verbose=False
        )
        
        # Clean up temp file
        os.unlink(temp_path)
        
        logger.info(f"Transcription complete: {len(result['segments'])} segments")
        
        return jsonify({
            'success': True,
            'text': result['text'],
            'language': result['language'],
            'segments': result['segments']
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
    Perform speaker diarization using pyannote
    Returns: { speakers[], turns[] }
    """
    try:
        if not diarization_pipeline:
            return jsonify({
                'error': 'Speaker diarization not available',
                'details': 'Pyannote pipeline not loaded. Set HUGGINGFACE_TOKEN environment variable.'
            }), 503
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Diarizing audio file: {audio_file.filename}")
        
        # Run diarization
        diarization = diarization_pipeline(temp_path)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        # Format results
        turns = []
        speakers = set()
        
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speakers.add(speaker)
            turns.append({
                'speaker': speaker,
                'start': turn.start,
                'end': turn.end,
                'duration': turn.end - turn.start
            })
        
        logger.info(f"Diarization complete: {len(speakers)} speakers, {len(turns)} turns")
        
        return jsonify({
            'success': True,
            'speakers': list(speakers),
            'num_speakers': len(speakers),
            'turns': turns
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
    Full analysis: transcription + speaker diarization
    Returns combined results
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file (reuse for both operations)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        logger.info(f"Full analysis for: {audio_file.filename}")
        
        # 1. Transcribe (auto-detect language)
        logger.info("Step 1: Transcription...")
        transcription_result = whisper_model.transcribe(
            temp_path,
            task='transcribe',
            verbose=False
        )
        
        # 2. Diarize (if available)
        diarization_result = None
        if diarization_pipeline:
            logger.info("Step 2: Speaker diarization...")
            diarization = diarization_pipeline(temp_path)
            
            turns = []
            speakers = set()
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                speakers.add(speaker)
                turns.append({
                    'speaker': speaker,
                    'start': turn.start,
                    'end': turn.end,
                    'duration': turn.end - turn.start
                })
            
            diarization_result = {
                'speakers': list(speakers),
                'num_speakers': len(speakers),
                'turns': turns
            }
        else:
            logger.warning("Skipping diarization (not available)")
        
        # Clean up temp file
        os.unlink(temp_path)
        
        # Combine results
        result = {
            'success': True,
            'transcription': {
                'text': transcription_result['text'],
                'language': transcription_result['language'],
                'segments': transcription_result['segments']
            },
            'diarization': diarization_result
        }
        
        logger.info("Full analysis complete")
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Full analysis error: {e}")
        return jsonify({
            'error': 'Full analysis failed',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("Starting ClarityTalk Python Service...")
    logger.info("Loading models (this may take a minute)...")
    
    load_models()
    
    port = int(os.getenv('PORT', 5001))
    
    logger.info("="*60)
    logger.info("🚀 ClarityTalk Python Service")
    logger.info("="*60)
    logger.info(f"📍 Running on port: {port}")
    logger.info(f"🎤 Whisper model: {'✓ Loaded' if whisper_model else '✗ Failed'}")
    logger.info(f"👥 Speaker diarization: {'✓ Loaded' if diarization_pipeline else '✗ Not available'}")
    logger.info("="*60)
    
    # Run Flask app (debug=False for production)
    app.run(host='0.0.0.0', port=port, debug=False)
