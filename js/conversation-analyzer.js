// Configuration
const API_BASE_URL = 'https://claritytalk-website-1.onrender.com';

// ============================================
// Utility Functions (from emotion-demo.js)
// ============================================

function detectLanguage() {
    return 'en';
}

function formatEmotionName(name) {
    const formatted = name
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    return formatted;
}

function getEmotionColor(name) {
    const positive = ['joy', 'contentment', 'interest', 'excitement', 'admiration', 'love', 'pride', 'amusement', 'satisfaction', 'relief'];
    const negative = ['anger', 'annoyance', 'anxiety', 'fear', 'disgust', 'sadness', 'distress', 'pain', 'contempt', 'embarrassment', 'shame'];
    const lowerName = name.toLowerCase();
    
    if (positive.some(p => lowerName.includes(p))) return '#4CAF50';
    if (negative.some(n => lowerName.includes(n))) return '#f44336';
    return '#2196F3';
}

function generateEmotionSummary(emotions) {
    if (!emotions || emotions.length === 0) {
        return 'Insufficient data for analysis.';
    }

    const top3 = emotions.slice(0, 3);
    const top1Name = formatEmotionName(top3[0].name).toLowerCase();
    const top1Score = top3[0].score;
    const top2Name = formatEmotionName(top3[1]?.name || '').toLowerCase();
    const top2Score = top3[1]?.score || 0;
    const top3Name = formatEmotionName(top3[2]?.name || '').toLowerCase();
    const top3Score = top3[2]?.score || 0;

    const getIntensity = (score) => {
        if (score > 0.25) return 'strong';
        if (score > 0.15) return 'notable';
        if (score > 0.08) return 'moderate';
        return 'subtle';
    };

    const getEmotionContext = (emotionName) => {
        const contexts = {
            'determination': '(focused resolve)',
            'concentration': '(mental focus)',
            'interest': '(engaged attention)',
            'excitement': '(energetic enthusiasm)',
            'calmness': '(peaceful composure)',
            'contemplation': '(thoughtful reflection)',
            'admiration': '(respectful appreciation)',
            'pride': '(confident satisfaction)',
            'joy': '(positive happiness)',
            'satisfaction': '(contentment)',
            'anxiety': '(worried tension)',
            'anger': '(intense frustration)',
            'confusion': '(uncertain puzzlement)',
            'distress': '(emotional discomfort)',
            'love': '(warm affection)',
            'amusement': '(lighthearted enjoyment)'
        };
        return contexts[emotionName] || '';
    };

    const intensity1 = getIntensity(top1Score);
    const intensity2 = getIntensity(top2Score);
    const intensity3 = getIntensity(top3Score);
    const context1 = getEmotionContext(top1Name);
    const context2 = getEmotionContext(top2Name);
    const context3 = getEmotionContext(top3Name);

    // Build dynamic summary based on actual emotions detected
    let summary = `This voice demonstrates `;
    
    // Add first emotion with intensity
    summary += `${intensity1} ${top1Name} ${context1}`;
    
    // Add second emotion if present
    if (top2Name && top2Score > 0.05) {
        summary += ` combined with ${intensity2} ${top2Name} ${context2}`;
    }
    
    // Add interpretation based on combination
    const emotionSet = new Set([top1Name, top2Name, top3Name].map(e => e.toLowerCase()));
    
    if (emotionSet.has('determination') && (emotionSet.has('anger') || emotionSet.has('concentration'))) {
        summary += `. This blend suggests focused, goal-oriented communication with assertive energy`;
    } else if (emotionSet.has('determination') && emotionSet.has('calmness')) {
        summary += `. This combination indicates controlled, purposeful delivery`;
    } else if (emotionSet.has('anger') && top1Score > 0.15) {
        summary += `. The elevated intensity suggests passionate or frustrated expression`;
    } else if (emotionSet.has('calmness') || emotionSet.has('contentment')) {
        summary += `. This creates a measured, composed communication style`;
    } else if (emotionSet.has('anxiety') || emotionSet.has('distress')) {
        summary += `. There are signs of tension or concern in the delivery`;
    } else if (emotionSet.has('joy') || emotionSet.has('excitement')) {
        summary += `. The voice carries positive, energetic qualities`;
    } else {
        summary += `, creating a distinct emotional tone`;
    }
    
    // Add third emotion as complementary note if significant
    if (top3Name && top3Score > 0.07) {
        summary += `. The ${intensity3} ${top3Name} ${context3} adds nuance to the expression`;
    }
    
    summary += `.`;
    
    return summary;
}

// ============================================
// Conversation Analyzer Class
// ============================================

class ConversationAnalyzer {
    constructor() {
        this.uploadSection = document.getElementById('upload-section');
        this.progressSection = document.getElementById('progress-section');
        this.resultsSection = document.getElementById('results-section');
        this.uploadZone = document.getElementById('upload-zone');
        this.fileInput = document.getElementById('audio-file-input');
        this.progressBar = document.getElementById('progress-bar');
        
        // Recording elements
        this.recordingZone = document.getElementById('recording-zone');
        this.recordBtn = document.getElementById('record-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.recordingTimer = document.getElementById('recording-timer');
        this.recordingStatus = document.getElementById('recording-status');
        this.recordingActions = document.getElementById('recording-actions');
        this.audioPreview = document.getElementById('audio-preview');
        this.audioPlayback = document.getElementById('audio-playback');
        this.useRecordingBtn = document.getElementById('use-recording-btn');
        this.reRecordBtn = document.getElementById('re-record-btn');
        
        // Recording state
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordedBlob = null;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.audioStream = null;
        
        this.analysisData = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Recording controls
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.resetBtn.addEventListener('click', () => this.resetRecording());
        this.reRecordBtn.addEventListener('click', () => this.resetRecording());
        this.useRecordingBtn.addEventListener('click', () => this.useRecording());

        // Click to upload
        this.uploadZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File selected
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        // Drag and drop
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('drag-over');
        });

        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.classList.remove('drag-over');
        });

        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    }

    async startRecording() {
        try {
            // Request microphone access
            this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            // Create MediaRecorder
            const options = { mimeType: 'audio/webm' };
            this.mediaRecorder = new MediaRecorder(this.audioStream, options);
            this.audioChunks = [];

            // Handle data available
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            });

            // Handle recording stop
            this.mediaRecorder.addEventListener('stop', () => {
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.recordedBlob = blob;
                
                // Check file size (10MB limit)
                if (blob.size > 10 * 1024 * 1024) {
                    alert('Recording is too large (max 10MB). Please record a shorter conversation.');
                    this.resetRecording();
                    return;
                }

                // Show preview
                const audioUrl = URL.createObjectURL(blob);
                this.audioPlayback.src = audioUrl;
                this.audioPreview.classList.add('active');
                
                console.log(`Recording complete: ${(blob.size / 1024).toFixed(2)} KB`);
            });

            // Start recording
            this.mediaRecorder.start();
            this.recordingStartTime = Date.now();
            
            // Update UI
            this.recordBtn.classList.add('recording');
            this.recordBtn.textContent = '⏺';
            this.recordingStatus.textContent = 'Recording in progress...';
            this.recordingActions.style.display = 'flex';
            
            // Start timer
            this.timerInterval = setInterval(() => {
                const elapsed = Date.now() - this.recordingStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.recordingTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }, 100);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please check your browser permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            
            // Stop all audio tracks
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
            }
            
            // Stop timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            // Update UI
            this.recordBtn.classList.remove('recording');
            this.recordBtn.textContent = '🎤';
            this.recordingStatus.textContent = 'Recording complete! Preview your audio below.';
            this.recordingActions.style.display = 'none';
        }
    }

    resetRecording() {
        // Stop recording if active
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.stopRecording();
        }
        
        // Stop all audio tracks
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        
        // Clear timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Reset state
        this.audioChunks = [];
        this.recordedBlob = null;
        this.recordingStartTime = null;
        
        // Reset UI
        this.recordBtn.classList.remove('recording');
        this.recordBtn.textContent = '🎤';
        this.recordingTimer.textContent = '00:00';
        this.recordingStatus.textContent = 'Click the microphone to start recording';
        this.recordingActions.style.display = 'none';
        this.audioPreview.classList.remove('active');
        this.audioPlayback.src = '';
    }

    async useRecording() {
        if (!this.recordedBlob) {
            alert('No recording available');
            return;
        }

        // Create a File object from the Blob
        const file = new File([this.recordedBlob], 'recording.webm', { 
            type: 'audio/webm',
            lastModified: Date.now()
        });

        console.log(`Using recording: ${(file.size / 1024).toFixed(2)} KB`);
        
        // Analyze the recording
        await this.analyzeConversation(file);
    }

    async handleFile(file) {
        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('File too large. Maximum size: 10MB');
            return;
        }

        if (!file.type.startsWith('audio/')) {
            alert('Please upload an audio file');
            return;
        }

        console.log(`Processing file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        
        // Start analysis
        await this.analyzeConversation(file);
    }

    async analyzeConversation(file) {
        try {
            // Show progress section
            this.showProgress();

            // Step 1: Upload
            this.updateProgress('upload', 25);
            await this.sleep(500);

            // Step 2: Processing (Whisper + pyannote + Hume)
            this.updateProgress('processing', 50);
            
            // Create FormData
            const formData = new FormData();
            formData.append('audio', file);

            // Send to full analysis API
            console.log('Sending request to full analysis API...');
            const response = await fetch(`${API_BASE_URL}/analyze-full`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || 'Analysis error');
            }

            const data = await response.json();
            console.log('Full analysis complete:', {
                transcription: data.transcription ? 'OK' : 'N/A',
                diarization: data.diarization ? `${data.diarization.num_speakers} speakers` : 'N/A',
                emotions: data.emotion_analysis?.emotions?.length || 0
            });

            // Step 3: Analyzing
            this.updateProgress('analyzing', 75);
            await this.sleep(500);

            // Step 4: Generating report
            this.updateProgress('generating', 100);
            await this.sleep(500);

            // Store complete analysis data
            this.analysisData = {
                // Legacy format for emotion display
                emotions: data.emotion_analysis?.emotions || [],
                totalFrames: data.emotion_analysis?.totalFrames || 0,
                // New data
                transcription: data.transcription,
                diarization: data.diarization,
                emotion_analysis: data.emotion_analysis
            };

            this.showResults(file);

        } catch (error) {
            console.error('Analysis error:', error);
            alert(`Error analyzing audio: ${error.message}`);
            this.resetToUpload();
        }
    }

    showProgress() {
        this.uploadSection.style.display = 'none';
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        
        // Reset icon petals to inactive state
        for (let i = 1; i <= 4; i++) {
            const petal = document.getElementById(`petal-${i}`);
            if (petal) {
                petal.classList.remove('active');
                petal.classList.add('inactive');
            }
        }
        
        // Reset center circle
        const centerCircle = document.getElementById('center-circle');
        if (centerCircle) {
            centerCircle.classList.remove('active');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateProgress(step, percentage) {
        // Update progress bar
        this.progressBar.style.width = `${percentage}%`;

        // Update step states
        const steps = ['upload', 'processing', 'analyzing', 'generating'];
        const currentIndex = steps.indexOf(step);

        steps.forEach((s, index) => {
            const stepElement = document.getElementById(`step-${s}`);
            stepElement.classList.remove('active', 'completed');
            
            if (index < currentIndex) {
                stepElement.classList.add('completed');
            } else if (index === currentIndex) {
                stepElement.classList.add('active');
            }
        });

        // Animate icon petals (1-indexed)
        for (let i = 0; i <= currentIndex; i++) {
            const petal = document.getElementById(`petal-${i + 1}`);
            if (petal) {
                petal.classList.remove('inactive');
                petal.classList.add('active');
            }
        }

        // Activate center when all petals are lit
        const centerCircle = document.getElementById('center-circle');
        if (centerCircle && currentIndex === steps.length - 1) {
            centerCircle.classList.add('active');
        }
    }

    showResults(file) {
        this.uploadSection.style.display = 'none';
        this.progressSection.style.display = 'none';
        this.resultsSection.style.display = 'block';
        
        // Update report date
        const dateElement = document.getElementById('report-date');
        const now = new Date();
        dateElement.textContent = `Analysis completed on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;

        // Generate report sections
        this.generateOverview(file);
        
        // Show transcription if available
        if (this.analysisData.transcription) {
            this.generateTranscription();
        }
        
        // Show diarization if available
        if (this.analysisData.diarization) {
            this.generateDiarization();
        }
        
        this.generateVoiceAnalysis();
        this.generateRecommendations();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    generateTranscription() {
        const section = document.getElementById('transcription-section');
        const content = document.getElementById('transcription-content');
        const data = this.analysisData.transcription;
        
        if (!data || !data.text) {
            return;
        }
        
        section.style.display = 'block';
        
        const html = `
            <div class="transcription-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                <button id="see-transcript-btn" style="padding: 0.75rem 1.5rem; background: var(--primary-teal); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                    📄 See Transcript
                </button>
                <button id="copy-transcription" style="padding: 0.75rem 1.5rem; background: var(--primary-orange); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: none;">
                    📋 Copy Text
                </button>
            </div>
            <div id="transcription-text-container" class="transcription-text" style="display: none; background: rgba(0, 0, 0, 0.3); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <p style="color: var(--text-white); line-height: 1.8; font-size: 1.05rem; margin: 0; white-space: pre-wrap;">${this.escapeHtml(data.text)}</p>
            </div>
        `;
        
        content.innerHTML = html;
        
        // Add see transcript functionality
        const seeTranscriptBtn = document.getElementById('see-transcript-btn');
        const transcriptContainer = document.getElementById('transcription-text-container');
        const copyBtn = document.getElementById('copy-transcription');
        
        if (seeTranscriptBtn && transcriptContainer) {
            seeTranscriptBtn.addEventListener('click', () => {
                if (transcriptContainer.style.display === 'none') {
                    transcriptContainer.style.display = 'block';
                    copyBtn.style.display = 'inline-block';
                    seeTranscriptBtn.textContent = '🔼 Hide Transcript';
                } else {
                    transcriptContainer.style.display = 'none';
                    copyBtn.style.display = 'none';
                    seeTranscriptBtn.textContent = '📄 See Transcript';
                }
            });
        }
        
        // Add copy functionality
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(data.text).then(() => {
                    copyBtn.textContent = '✓ Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = '📋 Copy Text';
                    }, 2000);
                });
            });
        }
    }
    
    generateDiarization() {
        const section = document.getElementById('diarization-section');
        const content = document.getElementById('diarization-content');
        const data = this.analysisData.diarization;
        
        if (!data || !data.turns || data.turns.length === 0) {
            return;
        }
        
        section.style.display = 'block';
        
        // Speaker colors
        const speakerColors = [
            '#4CAF50', '#2196F3', '#FF9800', '#E91E63', 
            '#9C27B0', '#00BCD4', '#FFEB3B', '#F44336'
        ];
        
        const speakers = data.speakers || [];
        
        let html = `
            <div class="diarization-summary" style="background: rgba(255, 153, 51, 0.1); border-left: 4px solid var(--primary-orange); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px;">
                <h3 style="margin-top: 0; margin-bottom: 1rem; color: var(--primary-orange); font-size: 1.15rem;">Summary</h3>
                <p style="color: var(--text-white); margin-bottom: 0.5rem;">Number of speakers detected: <strong>${data.num_speakers || speakers.length}</strong></p>
            </div>
            
            <div class="speaker-legend" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        `;
        
        // Speaker legend
        speakers.forEach((speaker, index) => {
            const color = speakerColors[index % speakerColors.length];
            html += `
                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border: 2px solid ${color};">
                    <div style="width: 16px; height: 16px; border-radius: 50%; background: ${color};"></div>
                    <span style="color: var(--text-white); font-weight: 600;">${speaker}</span>
                </div>
            `;
        });
        
        html += `
            </div>
            <div class="timeline" style="margin-top: 1.5rem;">
                <h4 style="color: var(--primary-teal); margin-bottom: 1rem;">Speaker Timeline</h4>
        `;
        
        // Timeline segments
        data.turns.forEach((turn, index) => {
            const speakerIndex = speakers.indexOf(turn.speaker);
            const color = speakerColors[speakerIndex % speakerColors.length];
            const startTime = this.formatTime(turn.start);
            const endTime = this.formatTime(turn.end);
            const duration = (turn.duration || (turn.end - turn.start)).toFixed(1);
            
            html += `
                <div class="turn-segment" style="background: rgba(0, 0, 0, 0.3); border-left: 4px solid ${color}; padding: 1rem; margin-bottom: 0.75rem; border-radius: 8px; transition: all 0.3s ease;" 
                     onmouseover="this.style.background='rgba(0, 0, 0, 0.5)'" 
                     onmouseout="this.style.background='rgba(0, 0, 0, 0.3)'">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
                            <span style="color: var(--text-white); font-weight: 700;">${turn.speaker}</span>
                        </div>
                        <div style="color: var(--text-gray); font-size: 0.9rem;">
                            ${startTime} - ${endTime} <span style="color: var(--primary-teal); margin-left: 0.5rem;">(${duration}s)</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        content.innerHTML = html;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateOverview(file) {
        const overview = document.getElementById('overview-content');
        
        // Calculate useful metrics
        const transcription = this.analysisData.transcription;
        const emotions = this.analysisData.emotions || [];
        
        // Language
        const language = transcription?.language ? 
            (transcription.language === 'ru' ? 'Russian' : 
             transcription.language === 'en' ? 'English' : 
             transcription.language.toUpperCase()) : 'Unknown';
        
        // Duration from transcription segments
        let duration = '0:00';
        if (transcription?.segments && transcription.segments.length > 0) {
            const lastSegment = transcription.segments[transcription.segments.length - 1];
            const totalSeconds = Math.floor(lastSegment.end || 0);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            duration = `${mins}:${String(secs).padStart(2, '0')}`;
        }
        
        // Word count
        const wordCount = transcription?.text ? 
            transcription.text.trim().split(/\s+/).length : 0;
        
        // Primary emotion
        const primaryEmotion = emotions.length > 0 ? emotions[0] : null;
        const primaryEmotionText = primaryEmotion ? 
            `${formatEmotionName(primaryEmotion.name)} (${(primaryEmotion.score * 100).toFixed(0)}%)` : 
            'Not detected';
        
        // Emotional tone
        let emotionalTone = 'Neutral';
        let toneEmoji = '😐';
        if (emotions.length > 0) {
            const positiveEmotions = ['joy', 'excitement', 'contentment', 'amusement', 'love', 'admiration'];
            const negativeEmotions = ['anger', 'sadness', 'anxiety', 'fear', 'distress', 'disgust'];
            
            let positiveScore = 0;
            let negativeScore = 0;
            
            emotions.forEach(e => {
                const name = e.name.toLowerCase();
                if (positiveEmotions.some(p => name.includes(p))) {
                    positiveScore += e.score;
                } else if (negativeEmotions.some(n => name.includes(n))) {
                    negativeScore += e.score;
                }
            });
            
            if (positiveScore > negativeScore && positiveScore > 0.3) {
                emotionalTone = 'Positive';
                toneEmoji = '😊';
            } else if (negativeScore > positiveScore && negativeScore > 0.3) {
                emotionalTone = 'Negative';
                toneEmoji = '😟';
            }
        }
        
        // Generate word cloud data
        let wordCloudTags = '';
        if (transcription?.text) {
            const text = transcription.text.toLowerCase();
            const stopWords = new Set([
                'и', 'в', 'на', 'с', 'по', 'не', 'а', 'к', 'что', 'это', 'как', 'у', 'о', 'за', 'из', 'от', 'до', 'для', 'при', 'но', 'так', 'же', 'то', 'вы', 'мы', 'он', 'она', 'они', 'я', 'ты', 'то', 'все', 'весь', 'это', 'этот', 'эта', 'эти', 'был', 'была', 'было', 'были', 'быть', 'есть',
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that'
            ]);
            
            const words = text.match(/[а-яёa-z]+/gi) || [];
            const wordCount = {};
            words.forEach(word => {
                if (word.length > 2 && !stopWords.has(word)) {
                    wordCount[word] = (wordCount[word] || 0) + 1;
                }
            });
            
            const repeatedWords = Object.entries(wordCount)
                .filter(([word, count]) => count >= 2)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            if (repeatedWords.length > 0) {
                repeatedWords.forEach(([word, count]) => {
                    let sizeClass = 'small';
                    if (count > 10) sizeClass = 'large';
                    else if (count >= 5) sizeClass = 'medium';
                    
                    wordCloudTags += `<span class="word-tag ${sizeClass}" style="margin: 0.25rem;">${word} (${count})</span>`;
                });
            }
        }
        
        const html = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
                <div class="stat-box" style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 153, 51, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center;">
                    <div class="stat-label" style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">🌍 Language</div>
                    <div class="stat-value" style="font-size: 1.2rem; font-weight: 700; color: var(--primary-orange);">${language}</div>
                </div>
                <div class="stat-box" style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 153, 51, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center;">
                    <div class="stat-label" style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">⏱️ Duration</div>
                    <div class="stat-value" style="font-size: 1.2rem; font-weight: 700; color: var(--primary-orange);">${duration}</div>
                </div>
                <div class="stat-box" style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 153, 51, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center;">
                    <div class="stat-label" style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">💬 Words</div>
                    <div class="stat-value" style="font-size: 1.2rem; font-weight: 700; color: var(--primary-orange);">${wordCount}</div>
                </div>
                
                <div class="stat-box" style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 153, 51, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center;">
                    <div class="stat-label" style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">🎯 Primary Emotion</div>
                    <div class="stat-value" style="font-size: 1rem; font-weight: 700; color: var(--primary-orange);">${primaryEmotionText}</div>
                </div>
                <div class="stat-box" style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 153, 51, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center;">
                    <div class="stat-label" style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">Emotional Tone</div>
                    <div class="stat-value" style="font-size: 1.2rem; font-weight: 700; color: var(--primary-orange);">${toneEmoji} ${emotionalTone}</div>
                </div>
                ${wordCloudTags ? `
                <div class="stat-box" style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 153, 51, 0.2); border-radius: 12px; padding: 1.5rem;">
                    <div class="stat-label" style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px; text-align: center;">💬 Most Repeated</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: center;">
                        ${wordCloudTags}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        overview.innerHTML = html;
    }

    generateVoiceAnalysis() {
        const voiceAnalysis = document.getElementById('voice-analysis-content');
        const emotions = this.analysisData.emotions || [];
        
        if (emotions.length === 0) {
            voiceAnalysis.innerHTML = '<p style="color: var(--text-gray);">No emotional data detected.</p>';
            return;
        }

        // Generate summary
        const summary = generateEmotionSummary(emotions);
        
        // Generate top-5 emotions list
        const top5Emotions = emotions.slice(0, 5);
        let top5HTML = '';
        
        top5Emotions.forEach((emotion, index) => {
            const percentage = (emotion.score * 100).toFixed(1);
            const color = getEmotionColor(emotion.name);
            const formattedName = formatEmotionName(emotion.name);

            top5HTML += `
                <div class="emotion-item" style="margin-bottom: 1.5rem; opacity: 0; animation: slideInLeft 0.5s ease forwards ${index * 0.05}s;">
                    <div class="emotion-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span class="emotion-label" style="font-weight: 600; color: var(--text-white); font-size: 1rem;">${formattedName}</span>
                        <span class="emotion-value" style="font-weight: 700; font-size: 1.1rem; color: var(--primary-teal);">${percentage}%</span>
                    </div>
                    <div class="emotion-bar-container" style="width: 100%; height: 12px; background: rgba(255, 255, 255, 0.1); border-radius: 6px; overflow: hidden;">
                        <div class="emotion-bar" style="height: 100%; width: ${percentage}%; background-color: ${color}; border-radius: 6px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                </div>
            `;
        });

        // Generate top-15 emotions list (for expanded view)
        const top15Emotions = emotions.slice(0, 15);
        let top15HTML = '';
        
        top15Emotions.forEach((emotion, index) => {
            const percentage = (emotion.score * 100).toFixed(1);
            const color = getEmotionColor(emotion.name);
            const formattedName = formatEmotionName(emotion.name);

            top15HTML += `
                <div class="emotion-item" style="margin-bottom: 1.5rem; opacity: 0; animation: slideInLeft 0.5s ease forwards ${index * 0.05}s;">
                    <div class="emotion-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span class="emotion-label" style="font-weight: 600; color: var(--text-white); font-size: 1rem;">${formattedName}</span>
                        <span class="emotion-value" style="font-weight: 700; font-size: 1.1rem; color: var(--primary-teal);">${percentage}%</span>
                    </div>
                    <div class="emotion-bar-container" style="width: 100%; height: 12px; background: rgba(255, 255, 255, 0.1); border-radius: 6px; overflow: hidden;">
                        <div class="emotion-bar" style="height: 100%; width: ${percentage}%; background-color: ${color}; border-radius: 6px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                </div>
            `;
        });

        const html = `
            <div class="emotion-summary" style="background: rgba(0, 204, 204, 0.1); border-left: 4px solid var(--primary-teal); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px;">
                <h3 style="margin-top: 0; margin-bottom: 1rem; color: var(--primary-teal); font-size: 1.25rem;">Voice Analysis</h3>
                <p style="color: var(--text-white); line-height: 1.7; margin-bottom: 0; font-size: 1rem;">${summary}</p>
            </div>
            
            <button class="toggle-top5" id="toggleTop5Btn" style="background: var(--primary-teal); color: #000; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; width: 100%; margin-bottom: 1rem; transition: all 0.3s ease;">
                👁️ Show Top 5 Emotions
            </button>
            
            <div class="emotion-top5-container collapsed" id="emotionTop5Container" style="max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.5s ease-in-out, opacity 0.3s ease, margin-bottom 0.3s ease;">
                <h4 style="color: var(--primary-teal); margin-top: 0; margin-bottom: 1.5rem; font-size: 1.15rem;">Top 5 Detected Emotions</h4>
                <div class="emotions-list-top5" id="emotionsTop5">
                    ${top5HTML}
                </div>
            </div>
            
            <button class="toggle-details" id="toggleDetailsBtn" style="background: var(--primary-orange); color: #000; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; width: 100%; margin-bottom: 1rem; transition: all 0.3s ease; display: none;">
                📊 Show More Emotions (Top 15)
            </button>
            
            <div class="emotion-details collapsed" id="emotionDetails" style="max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.5s ease-in-out, opacity 0.3s ease, margin-top 0.3s ease;">
                <h4 style="color: var(--primary-teal); margin-top: 0; margin-bottom: 1.5rem; font-size: 1.15rem;">Extended Emotion Breakdown (Top 15)</h4>
                <p class="results-description" style="color: var(--text-gray); font-size: 0.95rem; margin-bottom: 1.5rem;">Showing all ${Math.min(15, emotions.length)} most prominent emotions detected in the conversation.</p>
                <div class="emotions-list">
                    ${top15HTML}
                </div>
            </div>
        `;
        
        voiceAnalysis.innerHTML = html;

        // Add toggle functionality for top-5
        const toggleTop5Btn = document.getElementById('toggleTop5Btn');
        const top5Container = document.getElementById('emotionTop5Container');
        const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
        const detailsDiv = document.getElementById('emotionDetails');
        
        if (toggleTop5Btn && top5Container) {
            toggleTop5Btn.addEventListener('click', () => {
                const isCollapsed = top5Container.classList.contains('collapsed');
                
                if (isCollapsed) {
                    top5Container.classList.remove('collapsed');
                    top5Container.style.maxHeight = '1500px';
                    top5Container.style.opacity = '1';
                    top5Container.style.marginBottom = '1rem';
                    toggleTop5Btn.textContent = '🔼 Hide Top 5';
                    // Show the "Show More" button
                    if (toggleDetailsBtn) {
                        toggleDetailsBtn.style.display = 'block';
                    }
                } else {
                    top5Container.classList.add('collapsed');
                    top5Container.style.maxHeight = '0';
                    top5Container.style.opacity = '0';
                    top5Container.style.marginBottom = '0';
                    toggleTop5Btn.textContent = '👁️ Show Top 5 Emotions';
                    // Hide the "Show More" button and collapse details if open
                    if (toggleDetailsBtn) {
                        toggleDetailsBtn.style.display = 'none';
                    }
                    if (detailsDiv && !detailsDiv.classList.contains('collapsed')) {
                        detailsDiv.classList.add('collapsed');
                        detailsDiv.style.maxHeight = '0';
                        detailsDiv.style.opacity = '0';
                        detailsDiv.style.marginTop = '0';
                    }
                }
            });
        }
        
        // Add toggle functionality for top-15
        if (toggleDetailsBtn && detailsDiv) {
            toggleDetailsBtn.addEventListener('click', () => {
                const isCollapsed = detailsDiv.classList.contains('collapsed');
                
                if (isCollapsed) {
                    detailsDiv.classList.remove('collapsed');
                    detailsDiv.style.maxHeight = '3000px';
                    detailsDiv.style.opacity = '1';
                    detailsDiv.style.marginTop = '1rem';
                    toggleDetailsBtn.textContent = '🔼 Hide Extended List';
                } else {
                    detailsDiv.classList.add('collapsed');
                    detailsDiv.style.maxHeight = '0';
                    detailsDiv.style.opacity = '0';
                    detailsDiv.style.marginTop = '0';
                    toggleDetailsBtn.textContent = '📊 Show More Emotions (Top 15)';
                }
            });
        }

        // Add animation keyframes if not already present
        if (!document.querySelector('#slideInAnimation')) {
            const style = document.createElement('style');
            style.id = 'slideInAnimation';
            style.textContent = `
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    generateRecommendations() {
        const recommendationsContent = document.getElementById('recommendations-content');
        const emotions = this.analysisData.emotions || [];
        
        if (emotions.length === 0) {
            recommendationsContent.innerHTML = '<p style="color: var(--text-gray);">No recommendations available.</p>';
            return;
        }
        
        // Analyze top emotions to generate recommendations
        const topEmotion = emotions[0];
        const recommendations = [];
        
        // Emotion-based recommendations
        if (topEmotion.name === 'Determination' && topEmotion.score > 0.4) {
            recommendations.push({
                title: '✓ Maintain Your Focus',
                text: 'Your strong determination is excellent for goal-oriented communication. Continue this focused energy while ensuring you also listen actively to create balanced dialogue.'
            });
        }
        
        if (emotions.some(e => e.name === 'Anger' && e.score > 0.15)) {
            recommendations.push({
                title: '✓ Balance Strong Emotions',
                text: 'Elevated anger detected. While passion is valuable, consider taking brief pauses to regulate emotions. This will help ensure your message is received as intended rather than creating defensiveness.'
            });
        }
        
        if (emotions.some(e => e.name === 'Calmness' && e.score > 0.08)) {
            recommendations.push({
                title: '✓ Leverage Your Composure',
                text: 'Your calm demeanor creates a safe communication environment. Use this to your advantage when discussing difficult topics—it helps others feel heard and understood.'
            });
        }
        
        if (emotions.some(e => e.name === 'Anxiety' && e.score > 0.1)) {
            recommendations.push({
                title: '✓ Address Underlying Concerns',
                text: 'Signs of anxiety detected. Before important conversations, take time to identify specific concerns. Sharing these openly ("I\'m worried about...") can reduce tension and build connection.'
            });
        }
        
        if (emotions.some(e => e.name === 'Interest' && e.score > 0.12)) {
            recommendations.push({
                title: '✓ Channel Your Curiosity',
                text: 'Your genuine interest shines through. Keep asking open-ended questions to deepen understanding. This natural curiosity is a strength in building meaningful conversations.'
            });
        }
        
        // Generic recommendations if specific ones aren't triggered
        if (recommendations.length === 0) {
            recommendations.push({
                title: '✓ Enhance Emotional Awareness',
                text: 'Practice naming emotions during conversations. This "emotional labeling" helps both speakers understand the underlying feelings and leads to more productive dialogue.'
            });
        }
        
        // Always add this recommendation
        recommendations.push({
            title: '✓ Practice Active Listening',
            text: 'Before responding, summarize what you heard: "So what I\'m hearing is..." This ensures understanding and shows genuine engagement with the other person\'s perspective.'
        });
        
        // Build HTML
        let html = '';
        recommendations.forEach(rec => {
            html += `
                <div class="recommendation-card">
                    <div class="recommendation-title">${rec.title}</div>
                    <div class="recommendation-text">${rec.text}</div>
                </div>
            `;
        });
        
        recommendationsContent.innerHTML = html;
    }

    resetToUpload() {
        this.uploadSection.style.display = 'flex';
        this.progressSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.progressBar.style.width = '0%';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ConversationAnalyzer();
    console.log('Conversation Analyzer initialized');
});
