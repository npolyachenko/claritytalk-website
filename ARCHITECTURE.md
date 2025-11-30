# ClarityTalk Architecture

## 🎯 Обзор

ClarityTalk использует **готовые AI-модели** через API — мы ничего не обучаем сами.

## 🏗️ Компоненты системы

### 1. Транскрипция (Speech-to-Text)
| Параметр | Значение |
|----------|----------|
| **Провайдер** | OpenAI |
| **Модель** | Whisper-1 |
| **API Key** | `OPENAI_API_KEY` |
| **Что делает** | Превращает аудио в текст с временными метками |
| **Языки** | Автоопределение (100+ языков) |
| **Обучаем сами?** | ❌ Нет |

### 2. Анализ эмоций голоса
| Параметр | Значение |
|----------|----------|
| **Провайдер** | Hume AI |
| **Модель** | Expression Measurement (Prosody) |
| **API Keys** | `HUME_API_KEY`, `HUME_SECRET_KEY` |
| **Что делает** | Анализирует тон голоса → 48 эмоций |
| **Обучаем сами?** | ❌ Нет |

### 3. Определение спикеров (Diarization)
| Параметр | Значение |
|----------|----------|
| **Провайдер** | pyannote.audio (через HuggingFace) |
| **Модель** | speaker-diarization-3.1 |
| **API Key** | `HUGGINGFACE_TOKEN` |
| **Что делает** | Определяет "кто когда говорил" |
| **Обучаем сами?** | ❌ Нет |

### 4. Синтез речи (Text-to-Speech)
| Параметр | Значение |
|----------|----------|
| **Провайдер** | Hume AI |
| **Модель** | TTS API |
| **API Keys** | `HUME_API_KEY`, `HUME_SECRET_KEY` |
| **Что делает** | Генерирует речь с заданной эмоцией |
| **Обучаем сами?** | ❌ Нет |

## 🖥️ Серверы на Render

### claritytalk-website (Node.js)
- **URL**: `https://claritytalk-website.onrender.com`
- **Функции**: Основной API, координация всех сервисов
- **Runtime**: Node.js

### claritytalk-website-1 (Python)
- **URL**: `https://claritytalk-website-1.onrender.com`
- **Функции**: Speaker diarization (pyannote)
- **Runtime**: Python 3

## 🔑 Переменные окружения (Render)

```
# Node.js сервис (claritytalk-website)
OPENAI_API_KEY=sk-...
HUME_API_KEY=...
HUME_SECRET_KEY=...

# Python сервис (claritytalk-website-1)
HUGGINGFACE_TOKEN=hf_...
OPENAI_API_KEY=sk-...  (опционально, для резервной транскрипции)
```

## 📊 Поток данных

```
[Аудио файл]
     │
     ├──► [OpenAI Whisper] ──► Текст + сегменты
     │
     ├──► [Hume AI] ──► 48 эмоций с интенсивностью
     │
     └──► [pyannote] ──► Спикеры + временные метки
              │
              ▼
     [Объединённый отчёт]
```

## 💰 Стоимость API

| Сервис | Модель ценообразования |
|--------|------------------------|
| OpenAI Whisper | ~$0.006/минута аудио |
| Hume AI | По тарифу (есть free tier) |
| HuggingFace | Бесплатно (для pyannote) |

## 🚀 Что можно улучшить

1. **Fine-tuning эмоций** — обучить свою модель на специфических данных
2. **Кэширование** — не анализировать повторно
3. **GPU для pyannote** — ускорить diarization (сейчас CPU)
4. **Стриминг** — обрабатывать аудио в реальном времени
