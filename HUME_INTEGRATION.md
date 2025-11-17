# Hume AI Integration - Quick Start Guide

Интеграция Hume AI (Octave TTS + Voice Analysis) в ClarityTalk завершена! 🎉

## Что было добавлено

### 1. **Backend Server** (`/server`)
- Express.js прокси-сервер для безопасного взаимодействия с Hume AI API
- 2 эндпоинта:
  - `/api/tts` - генерация речи с эмоциями
  - `/api/analyze-voice` - анализ аудио на 48 эмоциональных характеристик

### 2. **Frontend Features** (`sample-report.html`)
- **Голосовой профиль (Vocal Expression Analysis)**: загрузка аудио + визуализация эмоций
- **Послушай разницу**: демо TTS с 4 эмоциями (спокойно, раздраженно, с беспокойством, с любовью)

### 3. **New Files Created**
```
server/
├── package.json        # Dependencies
├── server.js           # Express server with API endpoints
├── .env               # API key configuration
├── .env.example       # Template for .env
└── README.md          # Detailed documentation

js/
└── emotion-demo.js    # Frontend logic for TTS demo & voice analysis

css/
└── emotion-styles.css # Styling for new components
```

## 🚀 Запуск

### Шаг 1: Установка зависимостей

```bash
cd server
npm install
```

### Шаг 2: Настройка API ключа

Отредактируйте `server/.env` и добавьте ваш Hume AI API ключ:

```bash
HUME_API_KEY=ваш_реальный_ключ_здесь
PORT=3001
```

### Шаг 3: Запуск сервера

```bash
# В папке server/
npm start

# Или с авто-перезагрузкой (для разработки)
npm run dev
```

**Проверка**: Откройте http://localhost:3001/health в браузере

### Шаг 4: Запуск фронтенда

Откройте `sample-report.html` в браузере через локальный веб-сервер:

```bash
# Вариант 1: Python
python -m http.server 8000

# Вариант 2: Node.js http-server
npx http-server

# Вариант 3: PHP
php -S localhost:8000
```

Затем откройте: http://localhost:8000/sample-report.html

## ✅ Тестирование функций

### Функция 1: "Послушай разницу" (TTS Demo)

1. Scroll down `sample-report.html` to the **"Hear the Difference"** section
2. Click any of the buttons:
   - 😌 Calm
   - 😠 Irritated
   - 😟 Anxious
   - ❤️ Loving
3. Wait 3-5 seconds (speech generation)
4. Audio player will appear — click Play
5. Try all 4 emotions and hear the difference!

**What we're testing:**
- ✅ Buttons are clickable
- ✅ Loading state (button becomes transparent with spinner)
- ✅ Audio is generated and plays
- ✅ Different emotional coloring of voice

### Function 2: Vocal Expression Analysis

1. Prepare an audio file (MP3, WAV, M4A up to 10MB)
   - You can record a voice message on your phone
   - Or use any existing audio file with speech
2. In the **"Vocal Expression Analysis"** section, click **"📁 Upload and Analyze Audio"**
3. Select audio file
4. Wait for analysis (may take up to 2 minutes)
5. You'll see the top 15 emotional characteristics with percentages and colored bars

**What we're testing:**
- ✅ File uploads without errors
- ✅ Loading spinner appears
- ✅ Results display with animation
- ✅ Color coding (green = positive, red = negative, blue = neutral)

## 🐛 Troubleshooting

### Server won't start

**Error**: `Cannot find module 'express'`
```bash
cd server && npm install
```

**Error**: `HUME_API_KEY is not configured`
- Check that `server/.env` file exists
- Make sure it contains the correct API key
- Restart the server

### CORS errors in browser

**Problem**: `Access-Control-Allow-Origin`
- Make sure server is running on port 3001
- Check that frontend is opened via `http://localhost:8000`, not `file://`

### TTS doesn't work

1. Check browser console (F12 → Console)
2. Check server logs in terminal
3. Make sure API key is valid and has TTS access
4. Try shorter text

### Voice Analysis timeout

- File too large → reduce to < 5MB
- File too long → trim to < 2 minutes
- Hume API issues → check https://status.hume.ai

## 📊 Архитектура

```
┌─────────────────────────────────────┐
│  Browser (sample-report.html)       │
│  ├── emotion-demo.js                │
│  │   ├── EmotionTTSDemo             │
│  │   └── VoiceAnalyzer              │
│  └── emotion-styles.css             │
└────────────┬────────────────────────┘
             │ HTTP/JSON
             ↓
┌─────────────────────────────────────┐
│  Express Server (localhost:3001)    │
│  ├── POST /api/tts                  │
│  └── POST /api/analyze-voice        │
└────────────┬────────────────────────┘
             │ API Key
             ↓
┌─────────────────────────────────────┐
│  Hume AI Cloud                      │
│  ├── Octave TTS API                 │
│  └── Expression Measurement API      │
│      (Prosody Model)                │
└─────────────────────────────────────┘
```

## 🔧 Расширение функциональности

### Add new emotions for TTS

Edit `server/server.js`, add to `emotionDescriptions`:

```javascript
const emotionDescriptions = {
  calm: '...',
  irritated: '...',
  anxious: '...',
  loving: '...',
  excited: 'speaking with high energy and enthusiasm' // ← new emotion
};
```

Then add button in `sample-report.html`:
```html
<button data-emotion="excited">🤩 Excited</button>
```

### Show more emotions

In `js/emotion-demo.js` change the line:

```javascript
const topEmotions = emotions.slice(0, 15); // ← change 15 to 48
```

### Cache TTS

Add caching in `js/emotion-demo.js`:

```javascript
// At the beginning of EmotionTTSDemo class
this.audioCache = new Map();

// In generateSpeech method, before fetch:
const cacheKey = `${text}_${emotion}`;
if (this.audioCache.has(cacheKey)) {
  await this.playAudio(this.audioCache.get(cacheKey));
  return;
}

// After getting audioChunks:
this.audioCache.set(cacheKey, audioChunks);
```

## 📚 Дополнительная информация

- **Детальная документация сервера**: `server/README.md`
- **Hume AI Docs**: https://dev.hume.ai/
- **Hume AI Discord**: https://discord.gg/hume

## ✨ What's Next?

1. **Add real-time analysis**: use Hume Streaming API for real-time analysis
2. **Integrate into main report**: add voice analysis for both speakers
3. **Visualizations**: add emotion graphs over time (charts.js)
4. **Save results**: store analyses in localStorage or backend
5. **Comparison**: show difference between two recordings of the same person

---

**Ready for testing!** 🎉

If you have questions — see `server/README.md` or write in the repository issues.
