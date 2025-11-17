#!/bin/bash

# ClarityTalk Python Service Startup Script

echo "=================================="
echo "🚀 Starting ClarityTalk Python Service"
echo "=================================="
echo ""
echo "📋 Prerequisites:"
echo "  ✓ Python 3.9+"
echo "  ✓ ffmpeg installed"
echo "  ✓ Dependencies installed (pip install -r requirements.txt)"
echo ""
echo "🔧 Service will run on: http://localhost:5001"
echo ""
echo "💡 Tips:"
echo "  - First run will download Whisper models (~150MB)"
echo "  - For speaker diarization, set HUGGINGFACE_TOKEN in .env"
echo "  - Press Ctrl+C to stop"
echo ""
echo "=================================="
echo ""

# Check if .env exists and load it
if [ -f .env ]; then
    echo "Loading environment from .env..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start Python service
python3 python_service.py
