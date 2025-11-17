#!/usr/bin/env python3
"""
ClarityTalk Python Service - Simplified Version
Only Whisper transcription (no speaker diarization for now)
"""

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Global model
whisper_model = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'whisper_loaded': whisper_model is not None,
        'message': 'Whisper will load on first transcription request'
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio using Whisper
    Returns: { success, text, language, segments[] }
    """
    global whisper_model
    
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        logger.info(f"Transcribing: {audio_file.filename}")
        
        # Load model if not loaded
        if whisper_model is None:
            logger.info("Loading Whisper model...")
            whisper_model = whisper.load_model("base")
            logger.info("✓ Model loaded")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        # Transcribe
        result = whisper_model.transcribe(
            temp_path,
            task='transcribe',
            verbose=False
        )
        
        # Clean up
        os.unlink(temp_path)
        
        logger.info(f"✓ Transcription complete: {len(result.get('segments', []))} segments")
        
        return jsonify({
            'success': True,
            'text': result['text'],
            'language': result.get('language', 'unknown'),
            'segments': result.get('segments', []),
            'word_count': len(result['text'].split())
        })
    
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        return jsonify({
            'error': 'Transcription failed',
            'details': str(e)
        }), 500

@app.route('/analyze-full', methods=['POST'])
def analyze_full():
    """
    Full analysis: Whisper transcription (no diarization in simple version)
    Returns: { success, transcription, diarization: null }
    """
    global whisper_model
    
    try:
        # Debug logging
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request files: {list(request.files.keys())}")
        logger.info(f"Request form: {list(request.form.keys())}")
        logger.info(f"Content-Type: {request.content_type}")
        
        if 'audio' not in request.files:
            logger.error(f"No 'audio' file in request. Files present: {list(request.files.keys())}")
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        logger.info(f"Full analysis for: {audio_file.filename}")
        
        # Load model if not loaded
        if whisper_model is None:
            logger.info("Loading Whisper model...")
            whisper_model = whisper.load_model("base")
            logger.info("✓ Model loaded")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        # Transcribe
        result = whisper_model.transcribe(
            temp_path,
            task='transcribe',
            verbose=False
        )
        
        # Clean up
        os.unlink(temp_path)
        
        logger.info(f"✓ Full analysis complete: {len(result.get('segments', []))} segments")
        
        return jsonify({
            'success': True,
            'transcription': {
                'text': result['text'],
                'language': result.get('language', 'unknown'),
                'segments': result.get('segments', [])
            },
            'diarization': None  # Not available in simple version
        })
    
    except Exception as e:
        logger.error(f"Full analysis error: {e}", exc_info=True)
        return jsonify({
            'error': 'Full analysis failed',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("="*60)
    logger.info("🚀 ClarityTalk Python Service (Simplified)")
    logger.info("="*60)
    logger.info("📍 Starting on: http://localhost:5001")
    logger.info("🎤 Whisper: Will load on first request (lazy loading)")
    logger.info("💡 This avoids slow startup time")
    logger.info("="*60)
    logger.info("")
    
    # Run Flask app immediately (no model loading blocking startup)
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
