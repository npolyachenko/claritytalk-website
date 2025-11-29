#!/usr/bin/env python3
"""
ClarityTalk Python Service
Handles speech-to-text transcription using OpenAI Whisper API
"""

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

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

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'openai_configured': client is not None
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

@app.route('/analyze-full', methods=['POST'])
def analyze_full():
    """
    Full analysis: transcription
    Note: Speaker diarization not available with OpenAI API
    """
    return transcribe()

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
