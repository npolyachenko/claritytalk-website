// Configuration
// For local testing use localhost, for production use Render
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : 'https://claritytalk-website.onrender.com';

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

function translateEmotionName(name, language) {
    if (!language || language === 'English' || language === 'en') {
        return formatEmotionName(name);
    }
    
    // Russian translations
    if (language === 'Russian' || language === 'ru') {
        const translations = {
            'Admiration': 'Восхищение',
            'Adoration': 'Обожание',
            'Aesthetic Appreciation': 'Эстетическое восприятие',
            'Amusement': 'Веселье',
            'Anger': 'Гнев',
            'Annoyance': 'Раздражение',
            'Anxiety': 'Тревога',
            'Awe': 'Благоговение',
            'Awkwardness': 'Неловкость',
            'Boredom': 'Скука',
            'Calmness': 'Спокойствие',
            'Concentration': 'Концентрация',
            'Confusion': 'Замешательство',
            'Contemplation': 'Созерцание',
            'Contempt': 'Презрение',
            'Contentment': 'Удовлетворенность',
            'Craving': 'Жажда',
            'Determination': 'Решимость',
            'Disappointment': 'Разочарование',
            'Disapproval': 'Неодобрение',
            'Disgust': 'Отвращение',
            'Distress': 'Страдание',
            'Doubt': 'Сомнение',
            'Ecstasy': 'Экстаз',
            'Embarrassment': 'Смущение',
            'Empathic Pain': 'Эмпатическая боль',
            'Enthusiasm': 'Энтузиазм',
            'Entrancement': 'Очарование',
            'Envy': 'Зависть',
            'Excitement': 'Возбуждение',
            'Fear': 'Страх',
            'Gratitude': 'Благодарность',
            'Guilt': 'Вина',
            'Horror': 'Ужас',
            'Interest': 'Интерес',
            'Joy': 'Радость',
            'Love': 'Любовь',
            'Nostalgia': 'Ностальгия',
            'Pain': 'Боль',
            'Pride': 'Гордость',
            'Realization': 'Осознание',
            'Relief': 'Облегчение',
            'Romance': 'Романтика',
            'Sadness': 'Грусть',
            'Sarcasm': 'Сарказм',
            'Satisfaction': 'Удовлетворение',
            'Desire': 'Желание',
            'Shame': 'Стыд',
            'Surprise (negative)': 'Удивление (негативное)',
            'Surprise (positive)': 'Удивление (позитивное)',
            'Sympathy': 'Сочувствие',
            'Tiredness': 'Усталость',
            'Triumph': 'Триумф'
        };
        
        const formattedName = formatEmotionName(name);
        return translations[formattedName] || formattedName;
    }
    
    // For other languages, return formatted English name
    return formatEmotionName(name);
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
        // API endpoint
        this.apiEndpoint = API_BASE_URL;
        
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

            // Quick upload confirmation (minimal)
            await this.sleep(200);
            this.showUploadComplete();

            // Step 1: Transcription
            this.updateProgress('transcription', 10);
            
            // Create FormData
            const formData = new FormData();
            formData.append('audio', file);

            // Send to full analysis API with progress simulation
            console.log('Sending request to full analysis API...');
            
            // Start progress simulation while API works
            let progressStep = 0;
            const progressSteps = [
                { step: 'transcription', percent: 20, delay: 3000 },
                { step: 'diarization', percent: 40, delay: 5000 },
                { step: 'emotions', percent: 60, delay: 4000 },
            ];
            
            const progressInterval = setInterval(() => {
                if (progressStep < progressSteps.length) {
                    const { step, percent } = progressSteps[progressStep];
                    this.updateProgress(step, percent);
                    progressStep++;
                }
            }, 4000); // Advance every 4 seconds
            
            const response = await fetch(`${API_BASE_URL}/api/analyze-full`, {
                method: 'POST',
                body: formData
            });
            
            // Stop simulation
            clearInterval(progressInterval);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || 'Analysis error');
            }

            // Fast-forward to emotions step
            this.updateProgress('emotions', 75);
            
            const data = await response.json();
            console.log('Full analysis complete:', {
                transcription: data.transcription ? 'OK' : 'N/A',
                diarization: data.diarization ? `${data.diarization.num_speakers} speakers` : 'N/A',
                emotions: data.emotion_analysis?.emotions?.length || 0
            });

            // Step 4: Generating report
            this.updateProgress('generating', 100);
            await this.sleep(300);

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

            // Fallback: if diarization is missing, try dedicated endpoint
            if (!this.analysisData.diarization) {
                console.log('Diarization missing in analyze-full. Trying fallback /api/diarize ...');
                try {
                    await this.fetchDiarizationFallback(file);
                } catch (e) {
                    console.warn('Fallback diarization failed:', e.message);
                }
            }

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
        
        // Reset all steps to pending (grey)
        const steps = ['transcription', 'diarization', 'emotions', 'generating'];
        steps.forEach(s => {
            const stepElement = document.getElementById(`step-${s}`);
            const statusElement = document.getElementById(`status-${s}`);
            if (stepElement) {
                stepElement.classList.remove('active', 'completed');
            }
            if (statusElement) {
                statusElement.textContent = '⏳';
            }
        });
        
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
        
        // Reset upload status
        const uploadStatus = document.getElementById('upload-status');
        if (uploadStatus) {
            uploadStatus.style.opacity = '0';
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showUploadComplete() {
        const uploadStatus = document.getElementById('upload-status');
        if (uploadStatus) {
            uploadStatus.style.opacity = '1';
        }
    }

    updateProgress(step, percentage) {
        // Update progress bar
        this.progressBar.style.width = `${percentage}%`;

        // Update step states with new step names
        const steps = ['transcription', 'diarization', 'emotions', 'generating'];
        const currentIndex = steps.indexOf(step);

        steps.forEach((s, index) => {
            const stepElement = document.getElementById(`step-${s}`);
            const statusElement = document.getElementById(`status-${s}`);
            if (!stepElement) return;
            
            stepElement.classList.remove('active', 'completed');
            
            if (index < currentIndex) {
                // Completed - dark/black
                stepElement.classList.add('completed');
                if (statusElement) statusElement.textContent = '✓';
            } else if (index === currentIndex) {
                // Active - blue/teal
                stepElement.classList.add('active');
                if (statusElement) statusElement.textContent = '⚡';
            } else {
                // Pending - grey (default)
                if (statusElement) statusElement.textContent = '⏳';
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
        console.log('Diarization data:', this.analysisData.diarization);
        if (this.analysisData.diarization) {
            console.log('Calling generateDiarization...');
            this.generateDiarization();
        } else {
            console.log('No diarization data available');
        }
        
        this.generateVoiceAnalysis();
        this.generateRecommendations();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    generateTranscription() {
        const section = document.getElementById('transcription-section');
        const content = document.getElementById('transcription-content');
        const data = this.analysisData.transcription;
        const diarization = this.analysisData.diarization;
        
        console.log('generateTranscription called');
        console.log('Transcription data:', data);
        console.log('Diarization for transcript:', diarization);
        console.log('Has turns:', diarization?.turns?.length);
        console.log('Has segments:', data?.segments?.length);
        
        if (!data || !data.text) {
            return;
        }
        
        section.style.display = 'block';
        
        // Build speaker-attributed transcript if diarization available
        let transcriptHtml = '';
        const speakerColors = ['var(--primary-teal)', 'var(--primary-orange)', '#9b59b6', '#3498db'];
        const speakerBgColors = ['rgba(0, 204, 192, 0.1)', 'rgba(255, 153, 51, 0.1)', 'rgba(155, 89, 182, 0.1)', 'rgba(52, 152, 219, 0.1)'];
        
        const hasSpeakerData = diarization && diarization.turns && diarization.turns.length > 0 && data.segments && data.segments.length > 0;
        console.log('Will show speaker separation:', hasSpeakerData);
        
        // Check if segments already have speaker from server
        const segmentsHaveSpeaker = data.segments?.some(s => s.speaker);
        console.log('Segments already have speaker:', segmentsHaveSpeaker);
        
        if (hasSpeakerData || segmentsHaveSpeaker) {
            // Use speaker from segments if already assigned, otherwise match by timestamp
            const attributedSegments = segmentsHaveSpeaker ? data.segments : this.attributeSegmentsToSpeakers(data.segments, diarization.turns);
            
            // Group consecutive segments by speaker
            const speakerBlocks = [];
            let currentBlock = null;
            
            attributedSegments.forEach(seg => {
                if (!currentBlock || currentBlock.speaker !== seg.speaker) {
                    if (currentBlock) {
                        speakerBlocks.push(currentBlock);
                    }
                    currentBlock = {
                        speaker: seg.speaker,
                        segments: [seg],
                        startTime: seg.start || 0
                    };
                } else {
                    currentBlock.segments.push(seg);
                }
            });
            if (currentBlock) {
                speakerBlocks.push(currentBlock);
            }
            
            // Render speaker blocks
            speakerBlocks.forEach(block => {
                const speakerNum = parseInt(block.speaker?.replace('SPEAKER_', '') || '0') + 1;
                const color = speakerColors[(speakerNum - 1) % speakerColors.length];
                const bgColor = speakerBgColors[(speakerNum - 1) % speakerBgColors.length];
                const timeStr = this.formatTime(block.startTime);
                const text = block.segments.map(s => s.text).join(' ').trim();
                
                transcriptHtml += `
                    <div style="margin-bottom: 1.25rem; padding: 1rem 1.25rem; background: ${bgColor}; border-left: 4px solid ${color}; border-radius: 0 8px 8px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span style="color: ${color}; font-weight: 700; font-size: 0.95rem;">👤 Speaker ${speakerNum}</span>
                            <span style="color: var(--text-gray); font-size: 0.8rem; font-family: monospace;">⏱ ${timeStr}</span>
                        </div>
                        <p style="color: var(--text-white); line-height: 1.7; margin: 0; font-size: 1rem;">${this.escapeHtml(text)}</p>
                    </div>
                `;
            });
        } else {
            // Fallback: plain text
            transcriptHtml = `<p style="color: var(--text-white); line-height: 1.8; font-size: 1.05rem; margin: 0; white-space: pre-wrap;">${this.escapeHtml(data.text)}</p>`;
        }
        
        const numSpeakers = diarization?.num_speakers || 1;
        const speakerInfo = numSpeakers > 1 ? `<span style="color: var(--text-gray); font-size: 0.9rem;">👥 ${numSpeakers} speakers detected</span>` : '';
        
        const html = `
            <div class="transcription-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center;">
                <button id="see-transcript-btn" style="padding: 0.75rem 1.5rem; background: var(--primary-teal); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                    📄 See Transcript
                </button>
                <button id="copy-transcription" style="padding: 0.75rem 1.5rem; background: var(--primary-orange); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: none;">
                    📋 Copy Text
                </button>
                ${speakerInfo}
            </div>
            <div id="transcription-text-container" class="transcription-text" style="display: none; background: rgba(0, 0, 0, 0.3); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
                ${transcriptHtml}
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
                // Build formatted text with speaker attribution
                let copyText = '';
                const segmentsHaveSpeakerCopy = data.segments?.some(s => s.speaker);
                if (segmentsHaveSpeakerCopy || (diarization && diarization.turns && data.segments)) {
                    const attributedSegments = segmentsHaveSpeakerCopy ? data.segments : this.attributeSegmentsToSpeakers(data.segments, diarization.turns);
                    const speakerBlocks = [];
                    let currentBlock = null;
                    
                    attributedSegments.forEach(seg => {
                        if (!currentBlock || currentBlock.speaker !== seg.speaker) {
                            if (currentBlock) speakerBlocks.push(currentBlock);
                            currentBlock = {
                                speaker: seg.speaker,
                                segments: [seg],
                                startTime: seg.start || 0
                            };
                        } else {
                            currentBlock.segments.push(seg);
                        }
                    });
                    if (currentBlock) speakerBlocks.push(currentBlock);
                    
                    copyText = speakerBlocks.map(block => {
                        const speakerNum = parseInt(block.speaker?.replace('SPEAKER_', '') || '0') + 1;
                        const timeStr = this.formatTime(block.startTime);
                        const text = block.segments.map(s => s.text).join(' ').trim();
                        return `[${timeStr}] Speaker ${speakerNum}:\n${text}`;
                    }).join('\n\n');
                } else {
                    copyText = data.text;
                }
                
                navigator.clipboard.writeText(copyText).then(() => {
                    copyBtn.textContent = '✓ Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = '📋 Copy Text';
                    }, 2000);
                });
            });
        }
    }
    
    // Match transcription segments to speakers using timestamp overlap
    attributeSegmentsToSpeakers(segments, turns) {
        return segments.map(seg => {
            const segStart = seg.start || 0;
            const segEnd = seg.end || segStart;
            
            // Find the turn with most overlap
            let bestTurn = null;
            let bestOverlap = 0;
            
            turns.forEach(turn => {
                const overlap = Math.max(0, Math.min(segEnd, turn.end) - Math.max(segStart, turn.start));
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    bestTurn = turn;
                }
            });
            
            return {
                ...seg,
                speaker: bestTurn?.speaker || 'SPEAKER_0'
            };
        });
    }

    // Client-side fallback: call /api/diarize directly if analyze-full had no diarization
    async fetchDiarizationFallback(file) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4 * 60 * 1000); // 4 minutes
        try {
            const formData = new FormData();
            formData.append('audio', file);
            const resp = await fetch(`${API_BASE_URL}/api/diarize`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${txt}`);
            }
            const diar = await resp.json();
            if (diar && diar.turns && diar.turns.length > 0) {
                this.analysisData.diarization = diar;
                console.log('Fallback diarization success:', diar);
            }
        } finally {
            clearTimeout(timeout);
        }
    }
    
    // Compute per-speaker metrics using overlap of diarization turns and transcription segments
    computeSpeakerMetrics(diarization, transcription) {
        const speakers = diarization.speakers || [];
        const turns = diarization.turns || [];
        const segments = (transcription && Array.isArray(transcription.segments)) ? transcription.segments : [];

        // Aggregate speaking time per speaker
        const stats = {};
        speakers.forEach(s => stats[s] = { duration: 0, turns: 0, words: 0 });
        turns.forEach(t => {
            const d = (t.duration || (t.end - t.start)) || 0;
            if (!stats[t.speaker]) stats[t.speaker] = { duration: 0, turns: 0, words: 0 };
            stats[t.speaker].duration += d;
            stats[t.speaker].turns += 1;
        });

        // Distribute words to speakers by overlap with transcription segments
        const totalWords = (transcription?.text || '').trim().split(/\s+/).filter(Boolean).length;
        const segs = segments.map(s => ({
            start: typeof s.start === 'number' ? s.start : (s.start ?? 0),
            end: typeof s.end === 'number' ? s.end : (s.end ?? 0),
            words: (typeof s.text === 'string' ? s.text : s.text ?? '').trim().split(/\s+/).filter(Boolean).length
        })).filter(s => s.end > s.start);

        const overlap = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

        segs.forEach(s => {
            // Compute total overlap of this segment with all turns
            let totalOverlap = 0;
            const overlaps = [];
            turns.forEach(t => {
                const ov = overlap(s.start, s.end, t.start, t.end);
                if (ov > 0) {
                    overlaps.push({ spk: t.speaker, ov });
                    totalOverlap += ov;
                }
            });
            if (totalOverlap > 0 && s.words > 0) {
                overlaps.forEach(o => {
                    const share = (o.ov / totalOverlap) * s.words;
                    stats[o.spk].words += share;
                });
            }
        });

        // If we still have zero words (e.g., no segments), fallback to time proportion
        const totalDuration = Object.values(stats).reduce((acc, x) => acc + x.duration, 0) || 1;
        const wordsAssigned = Object.values(stats).reduce((acc, x) => acc + x.words, 0);
        if (wordsAssigned < 1 && totalWords > 0) {
            speakers.forEach(s => {
                const prop = stats[s].duration / totalDuration;
                stats[s].words = totalWords * prop;
            });
        }

        // Finalize metrics
        speakers.forEach(s => {
            const st = stats[s];
            st.words = Math.round(st.words);
            st.percentage = totalWords ? Math.round((st.words / totalWords) * 100) : 0;
            st.wordsPerMinute = st.duration > 0 ? Math.round((st.words / st.duration) * 60) : 0;
            st.speechRatePercent = st.wordsPerMinute ? Math.round((st.wordsPerMinute / 140) * 100) : 100;
            st.rateLabel = st.speechRatePercent > 110 ? 'Fast' : st.speechRatePercent < 90 ? 'Slow' : 'Normal';
        });

        return { stats, totalWords, totalDuration };
    }
    
    generateDiarization() {
        console.log('generateDiarization called');
        const section = document.getElementById('diarization-section');
        const content = document.getElementById('diarization-content');
        const data = this.analysisData.diarization;
        
        console.log('Diarization section element:', section);
        console.log('Diarization content element:', content);
        console.log('Diarization data:', data);
        
        if (!data || !data.turns || data.turns.length === 0) {
            console.log('No turns data, returning');
            return;
        }
        
        console.log('Setting section visible');
        section.style.display = 'block';
        
        const speakers = data.speakers || [];
        
        // Use server speaker_stats if available, otherwise compute locally
        let speakerStats, totalWords, totalDuration;
        if (data.speaker_stats) {
            console.log('Using server speaker_stats:', data.speaker_stats);
            speakerStats = data.speaker_stats;
            totalWords = Object.values(speakerStats).reduce((sum, s) => sum + (s.words || 0), 0);
            totalDuration = Object.values(speakerStats).reduce((sum, s) => sum + (s.duration || 0), 0);
            
            // Add computed fields
            speakers.forEach(spk => {
                if (speakerStats[spk]) {
                    const st = speakerStats[spk];
                    st.wordsPerMinute = st.duration > 0 ? Math.round((st.words / st.duration) * 60) : 0;
                    st.speechRatePercent = st.wordsPerMinute ? Math.round((st.wordsPerMinute / 140) * 100) : 100;
                    st.rateLabel = st.speechRatePercent > 110 ? 'Fast' : st.speechRatePercent < 90 ? 'Slow' : 'Normal';
                }
            });
        } else {
            const computed = this.computeSpeakerMetrics(data, this.analysisData.transcription);
            speakerStats = computed.stats;
            totalWords = computed.totalWords;
            totalDuration = computed.totalDuration;
        }
        
        // Speaker colors (same as transcription)
        const speakerColors = ['var(--primary-teal)', 'var(--primary-orange)', '#9b59b6', '#3498db'];
        const speakerBgColors = ['rgba(0, 204, 192, 0.1)', 'rgba(255, 153, 51, 0.1)', 'rgba(155, 89, 182, 0.1)', 'rgba(52, 152, 219, 0.1)'];
        
        let html = `
            <div style="margin-bottom: 2rem;">
        `;
        
        // Speaker cards (like sample report)
        speakers.forEach((speaker, index) => {
            const stats = speakerStats[speaker] || { duration: 0, turns: 0, words: 0, percentage: 0, speechRatePercent: 100, rateLabel: 'Normal' };
            const speechRateLabel = stats.rateLabel;
            const speechRateClass = speechRateLabel === 'Normal' ? 'metric-good' : 'metric-warning';
            // Extract speaker number (SPEAKER_0 -> 1, SPEAKER_1 -> 2, etc.)
            const speakerNumber = parseInt(speaker.replace('SPEAKER_', '')) + 1;
            const color = speakerColors[(speakerNumber - 1) % speakerColors.length];
            const bgColor = speakerBgColors[(speakerNumber - 1) % speakerBgColors.length];
            
            // Volume level (simulated based on speaker position - can be replaced with real data)
            const volumeLevel = 85 + Math.floor(Math.random() * 20); // 85-104%
            const volumeLabel = volumeLevel >= 90 ? 'Normal' : 'Low';
            const volumeClass = volumeLabel === 'Normal' ? 'metric-good' : 'metric-warning';
            stats.volumeLevel = volumeLevel;
            stats.volumeLabel = volumeLabel;
            
            html += `
                <div class="speaker-card" style="background: ${bgColor}; border: 1px solid ${color}; border-left: 4px solid ${color}; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
                    <div class="speaker-header" style="margin-bottom: 1rem;">
                        <span class="speaker-name" style="font-size: 1.3rem; color: ${color}; font-weight: 600;">👤 Speaker ${speakerNumber}</span>
                    </div>
                    <div class="speaker-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        <div class="speaker-stat">
                            <span class="speaker-stat-label" style="color: var(--text-gray); font-size: 0.85rem;">Words Spoken</span>
                            <span class="speaker-stat-value" style="color: var(--primary-teal); font-size: 1.1rem; font-weight: 600;">${stats.words} (${stats.percentage}%)</span>
                            <div class="progress-bar" style="background: rgba(255, 255, 255, 0.1); height: 8px; border-radius: 4px; overflow: hidden; margin-top: 0.5rem;">
                                <div class="progress-fill" style="height: 100%; background: var(--gradient-stress-harmony); width: ${stats.percentage}%;"></div>
                            </div>
                        </div>
                        <div class="speaker-stat">
                            <span class="speaker-stat-label" style="color: var(--text-gray); font-size: 0.85rem;">Speech Rate</span>
                            <span class="speaker-stat-value" style="color: var(--primary-teal); font-size: 1.1rem; font-weight: 600;">
                                ${stats.speechRatePercent}%
                                <span class="metric-indicator ${speechRateClass}" style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; margin-left: 0.5rem; background: ${speechRateClass === 'metric-good' ? 'rgba(0, 204, 204, 0.2)' : 'rgba(255, 153, 51, 0.2)'}; color: ${speechRateClass === 'metric-good' ? 'var(--primary-teal)' : 'var(--primary-orange)'};">\n                                    ${speechRateLabel}
                                </span>
                            </span>
                        </div>
                        <div class="speaker-stat">
                            <span class="speaker-stat-label" style="color: var(--text-gray); font-size: 0.85rem;">Volume Level</span>
                            <span class="speaker-stat-value" style="color: var(--primary-teal); font-size: 1.1rem; font-weight: 600;">
                                ${volumeLevel}%
                                <span class="metric-indicator ${volumeClass}" style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; margin-left: 0.5rem; background: ${volumeClass === 'metric-good' ? 'rgba(0, 204, 204, 0.2)' : 'rgba(255, 153, 51, 0.2)'}; color: ${volumeClass === 'metric-good' ? 'var(--primary-teal)' : 'var(--primary-orange)'};">\n                                    ${volumeLabel}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        
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
            `${translateEmotionName(primaryEmotion.name, language)} (${(primaryEmotion.score * 100).toFixed(0)}%)` : 
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

    // Split emotions by speaker using timestamps
    getEmotionsBySpeaker() {
        const emotionFrames = this.analysisData.emotion_analysis?.emotionFrames || [];
        const diarization = this.analysisData.diarization;
        
        console.log('[getEmotionsBySpeaker] emotionFrames length:', emotionFrames.length);
        console.log('[getEmotionsBySpeaker] diarization:', diarization);
        console.log('[getEmotionsBySpeaker] emotion_analysis:', this.analysisData.emotion_analysis);
        
        if (!emotionFrames.length || !diarization || !diarization.turns) {
            console.log('[getEmotionsBySpeaker] Returning null - missing data');
            return null;
        }
        
        const speakers = diarization.speakers || [];
        const speakerEmotions = {};
        
        // Initialize speaker emotion maps
        speakers.forEach(speaker => {
            speakerEmotions[speaker] = new Map();
        });
        
        // Assign emotion frames to speakers based on time overlap
        emotionFrames.forEach(frame => {
            const frameStart = frame.start || 0;
            const frameEnd = frame.end || frameStart;
            const frameDuration = frameEnd - frameStart;
            
            // Find overlapping speaker turns
            diarization.turns.forEach(turn => {
                const overlapStart = Math.max(frameStart, turn.start);
                const overlapEnd = Math.min(frameEnd, turn.end);
                const overlap = Math.max(0, overlapEnd - overlapStart);
                
                // If more than 50% of frame overlaps with this turn, assign to this speaker
                if (overlap > frameDuration * 0.5) {
                    frame.emotions.forEach(emotion => {
                        const current = speakerEmotions[turn.speaker].get(emotion.name) || { sum: 0, count: 0 };
                        speakerEmotions[turn.speaker].set(emotion.name, {
                            sum: current.sum + emotion.score,
                            count: current.count + 1
                        });
                    });
                }
            });
        });
        
        // Convert to sorted arrays
        const result = {};
        speakers.forEach(speaker => {
            const emotions = [];
            speakerEmotions[speaker].forEach((value, name) => {
                emotions.push({ name, score: value.sum / value.count });
            });
            emotions.sort((a, b) => b.score - a.score);
            result[speaker] = emotions;
        });
        
        return result;
    }

    async generateVoiceAnalysis() {
        const voiceAnalysis = document.getElementById('voice-analysis-content');
        const emotions = this.analysisData.emotions || [];
        const language = this.analysisData.transcription?.language || 'English';
        const diarization = this.analysisData.diarization;
        
        if (emotions.length === 0) {
            voiceAnalysis.innerHTML = '<p style="color: var(--text-gray);">No emotional data detected.</p>';
            return;
        }

        // Try to get emotions by speaker
        const emotionsBySpeaker = this.getEmotionsBySpeaker();
        const hasSpeakerEmotions = emotionsBySpeaker && Object.keys(emotionsBySpeaker).length > 1;
        
        console.log('[Voice Analysis] Emotions by speaker:', hasSpeakerEmotions ? 'Available' : 'Not available');

        // Generate summary via API in detected language
        let summary = 'Analyzing emotional content...';
        
        try {
            console.log('[Voice Analysis] Calling API for summary in language:', language);
            const response = await fetch(`${this.apiEndpoint}/api/generate-emotion-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, emotions })
            });
            
            if (response.ok) {
                const result = await response.json();
                summary = result.summary;
                console.log('[Voice Analysis] Summary generated successfully');
            } else {
                console.warn('[Voice Analysis] API failed, using fallback');
                summary = generateEmotionSummary(emotions);
            }
        } catch (error) {
            console.error('[Voice Analysis] Error:', error);
            summary = generateEmotionSummary(emotions);
        }
        
        let html = '';
        
        // Helper function to generate emotion list HTML
        const generateEmotionListHTML = (emotionsList, prefix = '') => {
            let html = '';
            emotionsList.forEach((emotion, index) => {
                const percentage = (emotion.score * 100).toFixed(1);
                const color = getEmotionColor(emotion.name);
                const formattedName = translateEmotionName(emotion.name, language);

                html += `
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
            return html;
        };
        
        // Show general summary
        html += `
            <div class="emotion-summary" style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-left: 4px solid var(--primary-orange); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px;">
                <h3 style="margin-top: 0; margin-bottom: 1rem; color: var(--primary-orange); font-size: 1.25rem;">Voice Analysis</h3>
                <p style="color: var(--text-white); line-height: 1.7; margin-bottom: 0; font-size: 1rem;">${summary}</p>
            </div>
        `;
        
        // Speaker colors
        const speakerColors = ['var(--primary-teal)', 'var(--primary-orange)', '#9b59b6', '#3498db'];
        const speakerBgColors = ['rgba(0, 204, 192, 0.1)', 'rgba(255, 153, 51, 0.1)', 'rgba(155, 89, 182, 0.1)', 'rgba(52, 152, 219, 0.1)'];
        
        // Show emotions by speaker if available
        if (hasSpeakerEmotions && diarization) {
            const speakers = diarization.speakers || [];
            
            // Single toggle button for all speakers
            html += `
                <button class="toggle-all-speakers" id="toggleAllSpeakersBtn" style="background: var(--primary-teal); color: #000; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; width: 100%; margin-bottom: 1rem; transition: all 0.3s ease;">
                    👥 Show Speaker Emotions
                </button>
                
                <div class="all-speakers-container collapsed" id="allSpeakersContainer" style="max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.5s ease-in-out, opacity 0.3s ease;">
                    <div class="emotion-legend" style="display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.5rem; padding: 0.75rem; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 16px; height: 16px; background: #4CAF50; border-radius: 3px;"></div>
                            <span style="color: var(--text-gray); font-size: 0.85rem;">${language === 'Russian' || language === 'ru' ? 'Позитивные' : 'Positive'}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 16px; height: 16px; background: #f44336; border-radius: 3px;"></div>
                            <span style="color: var(--text-gray); font-size: 0.85rem;">${language === 'Russian' || language === 'ru' ? 'Негативные' : 'Negative'}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 16px; height: 16px; background: #2196F3; border-radius: 3px;"></div>
                            <span style="color: var(--text-gray); font-size: 0.85rem;">${language === 'Russian' || language === 'ru' ? 'Нейтральные' : 'Neutral'}</span>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
            `;
            
            speakers.forEach((speaker, speakerIndex) => {
                const speakerNum = parseInt(speaker.replace('SPEAKER_', '')) + 1;
                const color = speakerColors[(speakerNum - 1) % speakerColors.length];
                const bgColor = speakerBgColors[(speakerNum - 1) % speakerBgColors.length];
                const speakerEmotions = emotionsBySpeaker[speaker] || [];
                const top5Speaker = speakerEmotions.slice(0, 5);
                
                if (top5Speaker.length === 0) return;
                
                html += `
                    <div style="background: ${bgColor}; border: 2px solid ${color}; border-radius: 12px; padding: 1.5rem;">
                        <h4 style="margin-top: 0; margin-bottom: 1.5rem; color: ${color}; font-size: 1.1rem; text-align: center;">👤 Speaker ${speakerNum}</h4>
                        ${generateEmotionListHTML(top5Speaker)}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        } else {
            // Fallback: show overall emotions
            const top5Emotions = emotions.slice(0, 5);
            const top5HTML = generateEmotionListHTML(top5Emotions);
            
            html += `
                <button class="toggle-top5" id="toggleTop5Btn" style="background: var(--primary-teal); color: #000; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; width: 100%; margin-bottom: 1rem; transition: all 0.3s ease;">
                    👁️ Show Top 5 Emotions
                </button>
                
                <div class="emotion-top5-container collapsed" id="emotionTop5Container" style="max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.5s ease-in-out, opacity 0.3s ease, margin-bottom 0.3s ease;">
                    <div class="emotion-legend" style="display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.5rem; padding: 0.75rem; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 16px; height: 16px; background: #4CAF50; border-radius: 3px;"></div>
                            <span style="color: var(--text-gray); font-size: 0.85rem;">${language === 'Russian' || language === 'ru' ? 'Позитивные' : 'Positive'}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 16px; height: 16px; background: #f44336; border-radius: 3px;"></div>
                            <span style="color: var(--text-gray); font-size: 0.85rem;">${language === 'Russian' || language === 'ru' ? 'Негативные' : 'Negative'}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 16px; height: 16px; background: #2196F3; border-radius: 3px;"></div>
                            <span style="color: var(--text-gray); font-size: 0.85rem;">${language === 'Russian' || language === 'ru' ? 'Нейтральные' : 'Neutral'}</span>
                        </div>
                    </div>
                    <h4 style="color: var(--primary-teal); margin-top: 0; margin-bottom: 1.5rem; font-size: 1.15rem;">Top 5 Detected Emotions</h4>
                    <div class="emotions-list-top5" id="emotionsTop5">
                        ${top5HTML}
                    </div>
                </div>
            `;
        }
        
        voiceAnalysis.innerHTML = html;

        // Add event listeners for single toggle button
        if (hasSpeakerEmotions && diarization) {
            const toggleBtn = document.getElementById('toggleAllSpeakersBtn');
            const container = document.getElementById('allSpeakersContainer');
            
            if (toggleBtn && container) {
                toggleBtn.addEventListener('click', () => {
                    const isCollapsed = container.classList.contains('collapsed');
                    
                    if (isCollapsed) {
                        container.classList.remove('collapsed');
                        container.style.maxHeight = '2000px';
                        container.style.opacity = '1';
                        toggleBtn.textContent = '🔼 Hide Speaker Emotions';
                    } else {
                        container.classList.add('collapsed');
                        container.style.maxHeight = '0';
                        container.style.opacity = '0';
                        toggleBtn.textContent = '👥 Show Speaker Emotions';
                    }
                });
            }
        } else {
            // Event listeners for fallback overall emotions view
            const toggleTop5Btn = document.getElementById('toggleTop5Btn');
            const top5Container = document.getElementById('emotionTop5Container');
            
            if (toggleTop5Btn && top5Container) {
                toggleTop5Btn.addEventListener('click', () => {
                    const isCollapsed = top5Container.classList.contains('collapsed');
                    
                    if (isCollapsed) {
                        top5Container.classList.remove('collapsed');
                        top5Container.style.maxHeight = '1500px';
                        top5Container.style.opacity = '1';
                        top5Container.style.marginBottom = '1rem';
                        toggleTop5Btn.textContent = '🔼 Hide Top 5';
                    } else {
                        top5Container.classList.add('collapsed');
                        top5Container.style.maxHeight = '0';
                        top5Container.style.opacity = '0';
                        top5Container.style.marginBottom = '0';
                        toggleTop5Btn.textContent = '👁️ Show Top 5 Emotions';
                    }
                });
            }
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

    async generateRecommendations() {
        const recommendationsContent = document.getElementById('recommendations-content');
        const emotions = this.analysisData.emotions || [];
        const diarization = this.analysisData.diarization;
        const language = this.analysisData.transcription?.language || 'English';
        
        if (emotions.length === 0) {
            recommendationsContent.innerHTML = '<p style="color: var(--text-gray);">No recommendations available.</p>';
            return;
        }
        
        // Show loading
        recommendationsContent.innerHTML = '<p style="color: var(--text-gray);">⚡ Generating insights...</p>';
        
        console.log('[Recommendations] Calling API with language:', language);
        console.log('[Recommendations] Endpoint:', `${this.apiEndpoint}/api/generate-text-analysis`);
        
        try {
            // Call API to generate analysis in detected language
            const response = await fetch(`${this.apiEndpoint}/api/generate-text-analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language,
                    diarization,
                    emotions
                })
            });
            
            console.log('[Recommendations] API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Recommendations] API error:', errorText);
                throw new Error('Failed to generate analysis');
            }
            
            const result = await response.json();
            const analysis = result.analysis;
            
            console.log('[Recommendations] API success! Generated analysis:', analysis);
            
            // Build HTML from AI-generated insights
            let html = '';
            
            // Speaker insights
            if (analysis.speaker_insights && analysis.speaker_insights.length > 0) {
                html += '<h4 style="color: var(--primary-teal); margin-bottom: 1rem; font-size: 1.1rem;">👥 ' + (language === 'Russian' ? 'Анализ по спикерам' : 'Speaker-Specific Insights') + '</h4>';
                analysis.speaker_insights.forEach(insight => {
                    html += `
                        <div class="recommendation-card">
                            <div class="recommendation-title">${insight.title}</div>
                            <div class="recommendation-text">${insight.text}</div>
                        </div>
                    `;
                });
            }
            
            // Emotion insights
            if (analysis.emotion_insights && analysis.emotion_insights.length > 0) {
                html += '<h4 style="color: var(--primary-teal); margin-bottom: 1rem; margin-top: 1.5rem; font-size: 1.1rem;">😊 ' + (language === 'Russian' ? 'Эмоциональный анализ' : 'Emotional Insights') + '</h4>';
                analysis.emotion_insights.forEach(insight => {
                    html += `
                        <div class="recommendation-card">
                            <div class="recommendation-title">${insight.title}</div>
                            <div class="recommendation-text">${insight.text}</div>
                        </div>
                    `;
                });
            }
            
            // General tips
            if (analysis.general_tips && analysis.general_tips.length > 0) {
                html += '<h4 style="color: var(--primary-teal); margin-bottom: 1rem; margin-top: 1.5rem; font-size: 1.1rem;">💡 ' + (language === 'Russian' ? 'Общие советы' : 'General Tips') + '</h4>';
                analysis.general_tips.forEach(tip => {
                    html += `
                        <div class="recommendation-card">
                            <div class="recommendation-title">${tip.title}</div>
                            <div class="recommendation-text">${tip.text}</div>
                        </div>
                    `;
                });
            }
            
            recommendationsContent.innerHTML = html;
            return;
            
        } catch (error) {
            console.error('Error generating AI recommendations:', error);
            // Fallback to hardcoded recommendations
            this.generateFallbackRecommendations(recommendationsContent, emotions, diarization);
        }
    }
    
    generateFallbackRecommendations(recommendationsContent, emotions, diarization) {
        const recommendations = [];
        
        // Speaker-specific analysis
        if (diarization && diarization.speakers && diarization.speakers.length > 1) {
            const speakers = diarization.speakers;
            const speakerStats = diarization.speaker_stats || {};
            
            // Analyze each speaker
            speakers.forEach(speaker => {
                const stats = speakerStats[speaker] || {};
                const speakerNum = parseInt(speaker?.replace('SPEAKER_', '') || '0') + 1;
                const percentage = stats.percentage || 0;
                const speechRatePercent = stats.speechRatePercent || 100;
                const volumeLevel = stats.volumeLevel || 100;
                
                // Balance check
                if (percentage > 70) {
                    recommendations.push({
                        title: `🗣️ Balance the Conversation (Speaker ${speakerNum})`,
                        text: `Speaker ${speakerNum} is speaking ${percentage}% of the time. Consider pausing more often to invite input from others. Try asking open-ended questions like "What are your thoughts on this?" to create space for balanced dialogue.`,
                        type: 'speaker',
                        speakerNum
                    });
                } else if (percentage < 40 && speakers.length === 2) {
                    recommendations.push({
                        title: `🎤 Speak Up More (Speaker ${speakerNum})`,
                        text: `Speaker ${speakerNum} is contributing only ${percentage}% of the conversation. Don't hesitate to share your perspective more actively. Your input is valuable to the discussion.`,
                        type: 'speaker',
                        speakerNum
                    });
                }
                
                // Speech rate check
                if (speechRatePercent > 130) {
                    recommendations.push({
                        title: `⚡ Slow Down (Speaker ${speakerNum})`,
                        text: `Speaker ${speakerNum} is speaking ${speechRatePercent}% faster than normal pace. Try slowing down slightly—this gives listeners time to process and shows you're not rushed.`,
                        type: 'speaker',
                        speakerNum
                    });
                } else if (speechRatePercent < 70) {
                    recommendations.push({
                        title: `🚀 Pick Up the Pace (Speaker ${speakerNum})`,
                        text: `Speaker ${speakerNum}'s speech rate is ${speechRatePercent}% of normal. Consider speaking a bit more energetically to maintain engagement.`,
                        type: 'speaker',
                        speakerNum
                    });
                }
                
                // Volume check
                if (volumeLevel < 80) {
                    recommendations.push({
                        title: `🔊 Project Your Voice (Speaker ${speakerNum})`,
                        text: `Speaker ${speakerNum}'s volume is at ${volumeLevel}%. Speaking louder helps convey confidence and ensures your message is clearly heard.`,
                        type: 'speaker',
                        speakerNum
                    });
                }
            });
            
            // Overall balance check
            if (speakers.length === 2) {
                const percentages = speakers.map(s => speakerStats[s]?.percentage || 0);
                const diff = Math.abs(percentages[0] - percentages[1]);
                
                if (diff < 20) {
                    recommendations.push({
                        title: '✓ Well-Balanced Conversation',
                        text: 'Both speakers are contributing roughly equally to the conversation. This balanced exchange creates space for mutual understanding and collaborative problem-solving.',
                        type: 'speaker'
                    });
                }
            }
        }
        
        // Emotion-based recommendations
        if (emotions.length > 0) {
            const topEmotion = emotions[0];
            
            // Check for Determination
            if (topEmotion.name === 'Determination' && topEmotion.score > 0.4) {
                recommendations.push({
                    title: '✓ Maintain Your Focus',
                    text: 'Your strong determination is excellent for goal-oriented communication. Continue this focused energy while ensuring you also listen actively to create balanced dialogue.',
                    type: 'emotion'
                });
            }
            
            // Check for Anger
            if (emotions.some(e => e.name === 'Anger' && e.score > 0.15)) {
                recommendations.push({
                    title: '✓ Balance Strong Emotions',
                    text: 'Elevated anger detected. While passion is valuable, consider taking brief pauses to regulate emotions. This will help ensure your message is received as intended rather than creating defensiveness.',
                    type: 'emotion'
                });
            }
            
            // Check for Calmness
            if (emotions.some(e => e.name === 'Calmness' && e.score > 0.08)) {
                recommendations.push({
                    title: '✓ Leverage Your Composure',
                    text: 'Your calm demeanor creates a safe communication environment. Use this to your advantage when discussing difficult topics—it helps others feel heard and understood.',
                    type: 'emotion'
                });
            }
            
            // Check for Anxiety
            if (emotions.some(e => e.name === 'Anxiety' && e.score > 0.1)) {
                recommendations.push({
                    title: '✓ Address Underlying Concerns',
                    text: 'Signs of anxiety detected. Before important conversations, take time to identify specific concerns. Sharing these openly ("I\'m worried about...") can reduce tension and build connection.',
                    type: 'emotion'
                });
            }
            
            // Check for Interest
            if (emotions.some(e => e.name === 'Interest' && e.score > 0.12)) {
                recommendations.push({
                    title: '✓ Channel Your Curiosity',
                    text: 'Your genuine interest shines through. Keep asking open-ended questions to deepen understanding. This natural curiosity is a strength in building meaningful conversations.',
                    type: 'emotion'
                });
            }
            
            // If no specific emotions triggered, add generic one
            if (recommendations.filter(r => r.type === 'emotion').length === 0 && topEmotion.score > 0.1) {
                recommendations.push({
                    title: `✓ ${topEmotion.name} Detected`,
                    text: `Your conversation shows ${topEmotion.name.toLowerCase()}. This emotional tone can impact how your message is received. Being aware of it helps you communicate more effectively.`,
                    type: 'emotion'
                });
            }
        }
        
        // General
        recommendations.push({
            title: '✓ Practice Active Listening',
            text: 'Before responding, summarize what you heard to ensure understanding.',
            type: 'general'
        });
        
        // Build HTML with colors
        const speakerColors = ['var(--primary-teal)', 'var(--primary-orange)', '#9b59b6', '#3498db'];
        const speakerBgColors = ['rgba(0, 204, 192, 0.1)', 'rgba(255, 153, 51, 0.1)', 'rgba(155, 89, 182, 0.1)', 'rgba(52, 152, 219, 0.1)'];
        
        let html = '';
        const speakerRecs = recommendations.filter(r => r.type === 'speaker');
        if (speakerRecs.length > 0) {
            html += '<h4 style="color: var(--primary-teal); margin-bottom: 1rem; font-size: 1.1rem;">👥 Speaker-Specific Insights</h4>';
            speakerRecs.forEach(rec => {
                const color = rec.speakerNum ? speakerColors[(rec.speakerNum - 1) % speakerColors.length] : 'var(--primary-teal)';
                const bgColor = rec.speakerNum ? speakerBgColors[(rec.speakerNum - 1) % speakerBgColors.length] : 'rgba(0, 0, 0, 0.3)';
                html += `<div class="recommendation-card" style="background: ${bgColor}; border-left: 4px solid ${color};"><div class="recommendation-title" style="color: ${color};">${rec.title}</div><div class="recommendation-text">${rec.text}</div></div>`;
            });
        }
        
        const emotionRecs = recommendations.filter(r => r.type === 'emotion');
        if (emotionRecs.length > 0) {
            html += '<h4 style="color: var(--primary-teal); margin-bottom: 1rem; margin-top: 1.5rem; font-size: 1.1rem;">😊 Emotional Insights</h4>';
            emotionRecs.forEach(rec => {
                html += `<div class="recommendation-card"><div class="recommendation-title">${rec.title}</div><div class="recommendation-text">${rec.text}</div></div>`;
            });
        }
        
        const generalRecs = recommendations.filter(r => r.type === 'general');
        if (generalRecs.length > 0) {
            html += '<h4 style="color: var(--primary-teal); margin-bottom: 1rem; margin-top: 1.5rem; font-size: 1.1rem;">💡 General Tips</h4>';
            generalRecs.forEach(rec => {
                html += `<div class="recommendation-card"><div class="recommendation-title">${rec.title}</div><div class="recommendation-text">${rec.text}</div></div>`;
            });
        }
        
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
