// Configuration
const API_BASE_URL = 'https://claritytalk-website.onrender.com';

// Utility: Detect user's language
function detectLanguage() {
    // Default to English for consistency
    return 'en';
}

// Emotion translations
const emotionTranslations = {
    en: {
        'Admiration': 'admiration', 'Adoration': 'adoration', 'AestheticAppreciation': 'aesthetic appreciation',
        'Amusement': 'amusement', 'Anger': 'anger', 'Annoyance': 'annoyance', 'Anxiety': 'anxiety',
        'Awe': 'awe', 'Awkwardness': 'awkwardness', 'Boredom': 'boredom', 'Calmness': 'calmness',
        'Concentration': 'concentration', 'Confusion': 'confusion', 'Contemplation': 'contemplation',
        'Contempt': 'contempt', 'Contentment': 'contentment', 'Craving': 'craving', 'Determination': 'determination',
        'Disappointment': 'disappointment', 'Disgust': 'disgust', 'Distress': 'distress', 'Doubt': 'doubt',
        'Ecstasy': 'ecstasy', 'Embarrassment': 'embarrassment', 'EmpatheticPain': 'empathetic pain',
        'Entrancement': 'entrancement', 'Envy': 'envy', 'Excitement': 'excitement', 'Fear': 'fear',
        'Guilt': 'guilt', 'Horror': 'horror', 'Interest': 'interest', 'Joy': 'joy', 'Love': 'love',
        'Nostalgia': 'nostalgia', 'Pain': 'pain', 'Pride': 'pride', 'Realization': 'realization',
        'Relief': 'relief', 'Romance': 'romance', 'Sadness': 'sadness', 'Satisfaction': 'satisfaction',
        'Desire': 'desire', 'Shame': 'shame', 'SurprisedPositive': 'surprise (positive)', 'SurprisedNegative': 'surprise (negative)',
        'Sympathy': 'sympathy', 'Tiredness': 'tiredness'
    },
    ru: {
        'Admiration': 'восхищение', 'Adoration': 'обожание', 'AestheticAppreciation': 'эстетическое восприятие',
        'Amusement': 'веселье', 'Anger': 'гнев', 'Annoyance': 'раздражение', 'Anxiety': 'тревога',
        'Awe': 'благоговение', 'Awkwardness': 'неловкость', 'Boredom': 'скука', 'Calmness': 'спокойствие',
        'Concentration': 'концентрация', 'Confusion': 'замешательство', 'Contemplation': 'созерцание',
        'Contempt': 'презрение', 'Contentment': 'удовлетворенность', 'Craving': 'тяга', 'Determination': 'решимость',
        'Disappointment': 'разочарование', 'Disgust': 'отвращение', 'Distress': 'страдание', 'Doubt': 'сомнение',
        'Ecstasy': 'экстаз', 'Embarrassment': 'смущение', 'EmpatheticPain': 'эмпатическая боль',
        'Entrancement': 'очарование', 'Envy': 'зависть', 'Excitement': 'возбуждение', 'Fear': 'страх',
        'Guilt': 'вина', 'Horror': 'ужас', 'Interest': 'интерес', 'Joy': 'радость', 'Love': 'любовь',
        'Nostalgia': 'ностальгия', 'Pain': 'боль', 'Pride': 'гордость', 'Realization': 'осознание',
        'Relief': 'облегчение', 'Romance': 'романтика', 'Sadness': 'грусть', 'Satisfaction': 'удовлетворение',
        'Desire': 'желание', 'Shame': 'стыд', 'SurprisedPositive': 'удивление (позитивное)', 'SurprisedNegative': 'удивление (негативное)',
        'Sympathy': 'сочувствие', 'Tiredness': 'усталость'
    }
};

// Utility: Translate emotion name
function translateEmotion(name, language) {
    const key = name.replace(/\s+/g, '');
    return emotionTranslations[language][key] || name.toLowerCase();
}

// Utility: Format emotion names from camelCase to Title Case
function formatEmotionName(name) {
    // Split by capital letters and join with spaces
    const formatted = name
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    return formatted;
}

// Generate emotion summary based on top emotions
function generateEmotionSummary(emotions, language) {
    if (!emotions || emotions.length === 0) {
        return 'Insufficient data for analysis.';
    }

    const top3 = emotions.slice(0, 3);
    const top1Name = translateEmotion(formatEmotionName(top3[0].name), language);
    const top1Score = top3[0].score;
    const top2Name = translateEmotion(formatEmotionName(top3[1]?.name || ''), language);
    const top2Score = top3[1]?.score || 0;
    const top3Name = translateEmotion(formatEmotionName(top3[2]?.name || ''), language);
    const top3Score = top3[2]?.score || 0;

    // Convert scores to intensity descriptors
    const getIntensity = (score) => {
        if (score > 0.25) return 'strong';
        if (score > 0.15) return 'notable';
        if (score > 0.08) return 'moderate';
        return 'subtle';
    };

    const intensity1 = getIntensity(top1Score);
    const intensity2 = getIntensity(top2Score);
    const intensity3 = getIntensity(top3Score);

    // Determine context based on emotion combinations
    const isEducational = ['determination', 'concentration', 'interest'].some(e => 
        top1Name.includes(e) || top2Name.includes(e)
    );
    const isConfident = ['determination', 'pride', 'admiration'].some(e => 
        top1Name.includes(e) || top2Name.includes(e)
    );
    const isCalm = ['calmness', 'contemplation', 'satisfaction'].some(e => 
        top1Name.includes(e) || top2Name.includes(e)
    );
    const isEmotional = ['joy', 'excitement', 'love', 'amusement'].some(e => 
        top1Name.includes(e) || top2Name.includes(e)
    );

    // Get emotion context explanations
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

    const context1 = getEmotionContext(top1Name);
    const context2 = getEmotionContext(top2Name);
    const context3 = getEmotionContext(top3Name);

    // English templates without percentages
    if (isEducational) {
        return `This voice shows ${intensity1} ${top1Name} ${context1} and ${intensity2} ${top2Name} ${context2}, characteristic of instructional or educational delivery. The ${intensity3} ${top3Name} ${context3} adds engagement to the communication.`;
    } else if (isConfident) {
        return `This voice conveys ${intensity1} ${top1Name} ${context1} combined with ${intensity2} ${top2Name} ${context2}, reflecting a confident and assertive communication style. ${top3Name.charAt(0).toUpperCase() + top3Name.slice(1)} ${context3} strengthens the overall impression.`;
    } else if (isCalm) {
        return `This voice is characterized by ${intensity1} ${top1Name} ${context1} and ${intensity2} ${top2Name} ${context2}, creating a measured and peaceful atmosphere. The ${intensity3} ${top3Name} ${context3} complements the overall tone.`;
    } else if (isEmotional) {
        return `This voice is filled with ${intensity1} ${top1Name} ${context1} and ${intensity2} ${top2Name} ${context2}, creating an emotionally expressive manner of speaking. ${top3Name.charAt(0).toUpperCase() + top3Name.slice(1)} ${context3} adds depth.`;
    }
    
    // Default template
    return `This voice demonstrates ${intensity1} ${top1Name} ${context1} and ${intensity2} ${top2Name} ${context2}. The ${intensity3} ${top3Name} ${context3} complements the overall emotional character.`;
}

// Utility: Get color for emotion based on type
function getEmotionColor(name) {
    // Positive emotions
    const positive = ['joy', 'contentment', 'interest', 'excitement', 'admiration', 'love', 'pride', 'amusement', 'satisfaction', 'relief'];
    // Negative emotions  
    const negative = ['anger', 'annoyance', 'anxiety', 'fear', 'disgust', 'sadness', 'distress', 'pain', 'contempt', 'embarrassment', 'shame'];
    
    const lowerName = name.toLowerCase();
    
    if (positive.some(p => lowerName.includes(p))) {
        return '#4CAF50'; // Green
    } else if (negative.some(n => lowerName.includes(n))) {
        return '#f44336'; // Red
    }
    return '#2196F3'; // Blue (neutral)
}

// Class: Voice Analyzer
class VoiceAnalyzer {
    constructor() {
        this.resultsContainer = document.getElementById('emotion-results');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadInput = document.getElementById('audio-upload');
        const analyzeBtn = document.getElementById('analyze-btn');

        if (uploadInput && analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                uploadInput.click();
            });

            uploadInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.analyzeAudio(e.target.files[0]);
                }
            });
        }
    }

    async analyzeAudio(file) {
        try {
            // Validate file
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                this.showError('File too large. Maximum size: 10MB');
                return;
            }

            // Show loading state
            this.showLoading();

            // Create FormData
            const formData = new FormData();
            formData.append('audio', file);

            // Send to API
            const response = await fetch(`${API_BASE_URL}/api/analyze-voice`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || 'Analysis error');
            }

            const data = await response.json();
            
            if (data.success && data.emotions) {
                this.displayEmotions(data.emotions);
            } else {
                throw new Error('Failed to get analysis results');
            }

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(error.message || 'An error occurred while analyzing audio');
        }
    }

    showLoading() {
        if (!this.resultsContainer) return;

        this.resultsContainer.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Analyzing your voice...</p>
                <p class="loading-subtext">This may take up to 2 minutes</p>
            </div>
        `;
        this.resultsContainer.style.display = 'block';
    }

    displayEmotions(emotions) {
        if (!this.resultsContainer || !emotions || emotions.length === 0) {
            this.showError('No emotions detected');
            return;
        }

        // Detect language
        const lang = detectLanguage();
        
        // Generate summary
        const summary = generateEmotionSummary(emotions, lang);

        // Show top emotions (limit to 15 for better UX)
        const topEmotions = emotions.slice(0, 15);

        // Build emotion list HTML
        let emotionListHTML = '';
        topEmotions.forEach((emotion, index) => {
            const percentage = (emotion.score * 100).toFixed(1);
            const color = getEmotionColor(emotion.name);
            const formattedName = formatEmotionName(emotion.name);

            emotionListHTML += `
                <div class="emotion-item" style="animation-delay: ${index * 0.05}s">
                    <div class="emotion-header">
                        <span class="emotion-label">${formattedName}</span>
                        <span class="emotion-value">${percentage}%</span>
                    </div>
                    <div class="emotion-bar-container">
                        <div class="emotion-bar" style="width: ${percentage}%; background-color: ${color}"></div>
                    </div>
                </div>
            `;
        });

        // UI text (English only)
        const t = {
            summaryTitle: 'Voice Analysis',
            showDetails: 'Show detailed metrics',
            hideDetails: 'Hide detailed metrics',
            detailsTitle: 'Detailed Emotion Breakdown',
            detectedCount: `Detected ${emotions.length} emotional characteristics. Showing top 15.`,
            analyzeAnother: 'Analyze Another File'
        };

        // Build complete HTML
        const html = `
            <div class="emotion-summary">
                <h3>${t.summaryTitle}</h3>
                <p>${summary}</p>
                <p class="intensity-legend" style="font-size: 0.85rem; color: var(--text-gray, #64748b); margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <strong>Intensity levels:</strong> Strong (most prominent) • Notable (clearly present) • Moderate (present) • Subtle (lightly present)
                </p>
            </div>
            <button class="toggle-details" id="toggleDetailsBtn">${t.showDetails}</button>
            <div class="emotion-details collapsed" id="emotionDetails">
                <h4>${t.detailsTitle}</h4>
                <p class="results-description">${t.detectedCount}</p>
                <div class="emotions-list">
                    ${emotionListHTML}
                </div>
            </div>
            <div class="emotion-footer">
                <button class="btn-secondary" onclick="location.reload()">${t.analyzeAnother}</button>
            </div>
        `;

        this.resultsContainer.innerHTML = html;
        this.resultsContainer.style.display = 'block';

        // Add toggle functionality
        const toggleBtn = document.getElementById('toggleDetailsBtn');
        const detailsDiv = document.getElementById('emotionDetails');
        
        toggleBtn.addEventListener('click', () => {
            detailsDiv.classList.toggle('collapsed');
            toggleBtn.textContent = detailsDiv.classList.contains('collapsed') 
                ? t.showDetails 
                : t.hideDetails;
        });

        // Trigger animation
        setTimeout(() => {
            this.resultsContainer.classList.add('visible');
        }, 100);
    }

    showError(message) {
        if (!this.resultsContainer) return;

        this.resultsContainer.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <p class="error-message">${message}</p>
                <button class="btn-secondary" onclick="location.reload()">Try Again</button>
            </div>
        `;
        this.resultsContainer.style.display = 'block';
    }
}

// Class: Emotion TTS Demo
class EmotionTTSDemo {
    constructor() {
        this.audioElement = document.getElementById('emotion-audio');
        this.currentEmotion = null;
        this.isPlaying = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const emotionButtons = document.querySelectorAll('[data-emotion]');
        
        emotionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const emotion = button.getAttribute('data-emotion');
                this.handleEmotionClick(emotion, button);
            });
        });
    }

    async handleEmotionClick(emotion, button) {
        if (this.isPlaying) {
            return; // Prevent multiple requests
        }

        try {
            // Update button states
            this.updateButtonStates(button);

            // Get the phrase to speak
            const phraseElement = document.querySelector('.demo-phrase');
            const text = phraseElement ? phraseElement.textContent.trim().replace(/"/g, '') : 'I understand this is important to you';

            // Generate speech
            await this.generateSpeech(text, emotion);

        } catch (error) {
            console.error('TTS error:', error);
            this.showToast('Speech generation error: ' + error.message, 'error');
            this.resetButtonStates();
        }
    }

    updateButtonStates(activeButton) {
        // Remove active state from all buttons
        document.querySelectorAll('[data-emotion]').forEach(btn => {
            btn.classList.remove('active', 'loading');
        });

        // Add loading state to clicked button
        activeButton.classList.add('loading');
        activeButton.disabled = true;
    }

    resetButtonStates() {
        document.querySelectorAll('[data-emotion]').forEach(btn => {
            btn.classList.remove('active', 'loading');
            btn.disabled = false;
        });
    }

    async generateSpeech(text, emotion) {
        this.isPlaying = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, emotion })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || 'Speech generation failed');
            }

            // Read streamed audio chunks
            const audioChunks = [];
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const chunk = JSON.parse(line);
                        if (chunk.audio) {
                            audioChunks.push(chunk.audio);
                        }
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            }

            // Combine all chunks and play
            if (audioChunks.length > 0) {
                await this.playAudio(audioChunks);
            } else {
                throw new Error('No audio data received');
            }

        } catch (error) {
            throw error;
        } finally {
            this.isPlaying = false;
        }
    }

    async playAudio(base64Chunks) {
        // Convert base64 chunks to a single blob
        const binaryChunks = base64Chunks.map(chunk => {
            const binary = atob(chunk);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        });

        const blob = new Blob(binaryChunks, { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);

        if (this.audioElement) {
            this.audioElement.src = url;
            this.audioElement.style.display = 'block';
            
            // Reset button states when audio ends
            this.audioElement.onended = () => {
                this.resetButtonStates();
            };

            // Mark active button
            const activeButton = document.querySelector('[data-emotion].loading');
            if (activeButton) {
                activeButton.classList.remove('loading');
                activeButton.classList.add('active');
                activeButton.disabled = false;
            }

            await this.audioElement.play();
        }
    }

    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Voice Analyzer if elements exist
    if (document.getElementById('emotion-results')) {
        new VoiceAnalyzer();
    }

    // Initialize TTS Demo if elements exist
    if (document.querySelector('[data-emotion]')) {
        new EmotionTTSDemo();
    }
    
    // Initialize phrase selector
    const phraseSelector = document.getElementById('phrase-selector');
    const currentPhrase = document.getElementById('current-phrase');
    
    if (phraseSelector && currentPhrase) {
        phraseSelector.addEventListener('change', (e) => {
            currentPhrase.textContent = `"${e.target.value}"`;
        });
    }
});
