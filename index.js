const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { fileTypeFromFile } = require('file-type');

const uploadDir = '/tmp/uploads';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

async function validateFile(filePath) {
  const type = await fileTypeFromFile(filePath);
  if (!type) return false;
  return ['image/jpeg', 'image/png', 'image/webp'].includes(type.mime);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// === HANYA IMPORT YANG DIGUNAKAN DI FRONTEND ===
// Sesuai dengan endpoint yang ada di Iyah.json
const endpointDefs = require("./Iyah.json");
const runOverview = require("./lib/info/overview");

const app = express();
const PORT = process.env.PORT || 4444;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Accept'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Middleware untuk statistik sederhana
app.use((req, res, next) => {
    const start = Date.now();
    
    // Update statistik sederhana
    db.data.totalRequests = (db.data.totalRequests || 0) + 1;
    db.write();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
});

// Helper function untuk overview
function calculateUptimePercentage() {
    const uptime = db.data.apiStats?.uptime || { startTime: new Date().toISOString() };
    const startTime = new Date(uptime.startTime);
    const now = new Date();
    const totalMinutes = (now - startTime) / (1000 * 60);
    const downtimeMinutes = totalMinutes * 0.002;
    return Math.min(99.8, ((totalMinutes - downtimeMinutes) / totalMinutes) * 100).toFixed(1);
}

// ========== ENDPOINT OVERVIEW ==========
const executors = {
  overview: runOverview
};

app.get("/overview", (req, res) => {
  const categories = endpointDefs.categories;

  if (!Array.isArray(categories)) {
    return res.status(500).json({
      error: "Invalid endpoint schema: categories missing"
    });
  }

  const overviewCategory = categories.find(
    c => c.name === "Overview"
  );

  if (!overviewCategory || !Array.isArray(overviewCategory.items)) {
    return res.status(404).json({
      error: "Overview category not found"
    });
  }

  const overviewItem = overviewCategory.items.find(
    i => i.path === "/overview"
  );

  if (!overviewItem) {
    return res.status(404).json({
      error: "Overview endpoint not registered"
    });
  }

  try {
    const result = runOverview({
      categories
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      error: "Overview execution failed",
      message: err.message
    });
  }
});

// ========== IMPORT MODUL YANG DIBUTUHKAN ==========
// Tambahkan import ini setelah import lainnya
const { handleMediaPreview } = require('./lib/mediapreview');
const { unlimitedai } = require('./lib/ai/unlimitedai');
const { perplexity } = require('./lib/ai/perplexity');
const { turboseek } = require('./lib/ai/turboseek');
const { grok } = require('./lib/ai/grok');
const { grokV2 } = require('./lib/ai/grokV2');
const { grokJailbreak } = require('./lib/ai/GrokJailbreak');
const { Copilot } = require ('./lib/ai/copilot');
const { webpilot } = require('./lib/ai/webpilot');
const { ciciai } = require('./lib/ai/ciciai');
const { reactToChannel } = require('./lib/tools/reactch');
const { removeBgDirect } = require('./lib/tools/removebg');
const { bypassai } = require('./lib/tools/bypassai');
const { unrestrictedai } = require('./lib/tools/toanime');
const { 
    removeClothes,
    createRemoveClothesTask,
    checkTaskStatus,
    checkDailyLimit,
    getLimitStatus,
    getQueueStatus,
    resetAllLimits,
    OWNER_API_KEY
} = require('./lib/tools/remove-clothes');
const { fetchScreenshot, screenshotCache, CACHE_DURATION } = require('./lib/tools/ssweb');
const { TikTokDownloader, formatDuration, formatNumber } = require('./lib/download/tiktok');
const { spotifyDl } = require('./lib/download/spotify');
const { pindl } = require('./lib/download/pinterest');
const { aiopro } = require('./lib/download/aio');
const { igstalk } = require('./lib/stalk/instagram');
const { ttstalk } = require('./lib/stalk/tiktok');
const { twitterstalk } = require('./lib/stalk/twitter');
const { top4top } = require('./lib/uploader/top4top');
const { uploadCatbox } = require('./lib/uploader/catbox');
const { 
  fetchMagicStudioImage, 
  generateImage,  
  imageCache 
} = require('./lib/tools/ttsim');
const { BluArsip } = require('./lib/random-image/BlueArchive');
const { Mobinime } = require('./lib/anime/detail');
const SimpleAsianTolick = require('./lib/random-image/asiantolick');
const Anhmoe = require('./lib/random-image/anhmoe');
const { qwentts } = require ('./lib/tools/text-to-speech');


// ========== ENDPOINT MEDIA PREVIEW ==========
app.get('/api/media/preview', (req, res) => {
    // Handle dengan module
    handleMediaPreview(req, res);
});

// ========== ENDPOINT AI ==========
app.get('/api/ai/perplexity', async (req, res) => {
    try {
        const { 
            query, 
            q, 
            search,
            web = 'true',
            academic = 'false', 
            social = 'false', 
            finance = 'false'
        } = req.query;

        const inputQuery = query || q || search;

        if (!inputQuery) {
            return res.status(400).json({
                success: false,
                message: "Missing search query. Use 'query', 'q', or 'search' parameter.",
                timestamp: new Date().toISOString(),
                example: "/api/ai/perplexity?query=what is quantum computing"
            });
        }

        const sourceConfig = {
            web: web === 'true',
            academic: academic === 'true',
            social: social === 'true',
            finance: finance === 'true'
        };

        const result = await perplexity({
            query: inputQuery,
            source: sourceConfig
        });
        
        res.json({
            success: true,
            data: result,
            endpoint: '/api/ai/perplexity',
            timestamp: new Date().toISOString(),
            sources_used: Object.keys(sourceConfig).filter(key => sourceConfig[key])
        });
        
    } catch (error) {
        console.error('Perplexity error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to search with Perplexity';
        
        if (error.message.includes('Query is required') || error.message.includes('No result found')) {
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/webpilot', async (req, res) => {
    try {
        const { query, q, text, question } = req.query;
        const inputQuery = query || q || text || question;

        if (!inputQuery) {
            return res.status(400).json({
                success: false,
                message: "Missing query. Use 'query', 'q', 'text', or 'question' parameter.",
                timestamp: new Date().toISOString(),
                example: "/api/ai/webpilot?query=latest news about artificial intelligence"
            });
        }

        const result = await webpilot(inputQuery);
        
        res.json({
            success: true,
            data: {
                response: result.chat,
                sources: result.source,
                query: inputQuery
            },
            endpoint: '/api/ai/webpilot',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('WebPilot error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to get response from WebPilot';
        
        if (error.message.includes('Query is required')) {
            statusCode = 400;
        } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
            statusCode = 429;
            errorMessage = 'Rate limit exceeded. Please try again later.';
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/copilot', async (req, res) => {
    try {
        const { message, text, prompt, query, model = 'default' } = req.query;
        const inputText = message || text || prompt || query;

        if (!inputText) {
            return res.status(400).json({
                success: false,
                message: "Missing text input. Use 'message', 'text', 'prompt', or 'query' parameter.",
                timestamp: new Date().toISOString(),
                example: "/api/ai/copilot?message=Hello, how are you?&model=think-deeper"
            });
        }

        const copilot = new Copilot();
        const result = await copilot.chat(inputText, { model });
        
        res.json({
            success: true,
            data: {
                text: result.text,
                citations: result.citations,
                model: model,
                available_models: ['default', 'think-deeper', 'gpt-5']
            },
            endpoint: '/api/copilot',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Microsoft Copilot error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to get response from Microsoft Copilot';
        
        if (error.message.includes('Available models') || error.message.includes('Missing')) {
            statusCode = 400;
        } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
            statusCode = 429;
            errorMessage = 'Rate limit exceeded. Please try again later.';
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/turboseek', async (req, res) => {
    try {
        const { question, q, query } = req.query;
        const inputQuestion = question || q || query;

        if (!inputQuestion) {
            return res.status(400).json({
                success: false,
                message: "Missing question. Use 'question', 'q', or 'query' parameter.",
                timestamp: new Date().toISOString(),
                example: "/api/ai/turboseek?question=What is artificial intelligence?"
            });
        }

        const result = await turboseek(inputQuestion);
        
        res.json({
            success: true,
            data: result,
            endpoint: '/api/ai/turboseek',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('TurboSeek error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to process question';
        
        if (error.message.includes('Question is required') || error.message.includes('Missing')) {
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/unlimitedai', async (req, res) => {
    const { text } = req.query;
    
    if (!text) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'text' is required",
            example: "http://localhost:4444/api/ai/unlimitedai?text=hallo"
        });
    }

    try {
        const startTime = Date.now();
        const result = await unlimitedai(text);
        const responseTime = Date.now() - startTime;

        const response = {
            status: true,
            creator: "Ilhammmmm",
            prompt: text,
            model: result.model,
            result: result.text,
            info: {
                chatId: result.chatId,
                responseTime: `${responseTime}ms`,
                timestamp: result.timestamp
            }
        };

        res.json(response);
        
    } catch (error) {
        console.error('Endpoint error:', error);
        res.status(500).json({
            status: false,
            message: "API Error",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/GrokJailbreak', async (req, res) => {
    const { 
        text, 
        model = 'grok', 
        session_id, 
        direct = 'false',
        jailbreak = 'false'
    } = req.query;
    
    if (!text) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'text' is required",
            example: "http://localhost:4444/api/ai/grokV2?text=hallo"
        });
    }

    try {
        const startTime = Date.now();
        let result;
        let isNewSession = false;
        let isJailbroken = false;
        
        if (direct === 'true') {
            result = await grokJailbreak.chatWithJailbreak(text, { 
                model, 
                jailbreak: true
            });
            isNewSession = true;
            isJailbroken = result.isJailbroken || false;
        } else if (jailbreak === 'true') {
            result = await grokJailbreak.chatWithJailbreak(text, { 
                model, 
                jailbreak: true 
            });
            isNewSession = true;
            isJailbroken = result.isJailbroken || false;
        } else if (session_id) {
            result = await grokJailbreak.continueChat(text, session_id);
            
            if (!result.success) {
                result = await grokJailbreak.chatWithJailbreak(text, { 
                    model, 
                    jailbreak: false 
                });
                isNewSession = true;
            }
        } else {
            result = await grokJailbreak.chatWithJailbreak(text, { 
                model, 
                jailbreak: true
            });
            isNewSession = true;
            isJailbroken = result.isJailbroken || false;
        }
        
        const responseTime = Date.now() - startTime;

        if (result.success) {
            const response = {
                status: true,
                creator: "Ilhammmmm",
                prompt: text,
                model: result.model || model,
                result: result.reply,
                info: {
                    sessionId: result.sessionId || 'N/A',
                    conversationId: result.conversationId || 'N/A',
                    isNewSession: isNewSession,
                    isJailbroken: isJailbroken,
                    sessionAge: session_id ? grokJailbreak.getSessionAge(session_id) || 0 : 0,
                    messagesInSession: session_id ? grokJailbreak.getMessagesCount(session_id) || 1 : 1,
                    greeting: result.greeting || "hai",
                    responseTime: `${responseTime}ms`,
                    timestamp: new Date().toISOString()
                }
            };

            res.json(response);
        } else {
            res.status(500).json({
                status: false,
                message: "AI Error",
                error: result.error,
                timestamp: new Date().toISOString(),
                suggestion: "Please try again with different parameters"
            });
        }
        
    } catch (error) {
        console.error('[GrokJailbreak] Endpoint error:', error);
        res.status(500).json({
            status: false,
            message: "API Error",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/grokV2', async (req, res) => {
    const { text, model = 'grok', session_id, direct = 'false' } = req.query;
    
    if (!text) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'text' is required",
            example: "http://localhost:4444/api/ai/grokV2?text=hallo"
        });
    }

    try {
        const startTime = Date.now();
        let result;
        let isNewSession = false;
        
        if (direct === 'true') {
            result = await grokV2.directChat(text, { model });
        } else if (session_id) {
            result = await grokV2.continueChat(text, session_id);
            
            if (!result.success) {
                result = await grokV2.chatWithGreeting(text, { model });
                isNewSession = true;
            }
        } else {
            result = await grokV2.chatWithGreeting(text, { model });
            isNewSession = true;
        }
        
        const responseTime = Date.now() - startTime;

        if (result.success) {
            const response = {
                status: true,
                creator: "Ilhammmmm",
                prompt: text,
                model: result.model || model,
                result: result.reply,
                info: {
                    sessionId: result.sessionId || 'N/A',
                    conversationId: result.conversationId || 'N/A',
                    isNewSession: isNewSession,
                    sessionAge: session_id ? grokV2.getSessionAge(session_id) || 0 : 0,
                    messagesInSession: session_id ? grokV2.getMessagesCount(session_id) || 1 : 1,
                    greeting: result.greeting || "hai",
                    responseTime: `${responseTime}ms`,
                    timestamp: new Date().toISOString()
                }
            };

            res.json(response);
        } else {
            res.status(500).json({
                status: false,
                message: "AI Error",
                error: result.error,
                timestamp: new Date().toISOString(),
                suggestion: result.error.includes('nonce') || result.error.includes('403') ? 
                    "Session expired, please try again without session_id" : 
                    "Please try again in a few moments"
            });
        }
        
    } catch (error) {
        console.error('[GrokV2] Endpoint error:', error);
        res.status(500).json({
            status: false,
            message: "API Error",
            error: error.message,
            timestamp: new Date().toISOString(),
            suggestion: "The AI service might be temporarily unavailable. Please try again later."
        });
    }
});

app.get('/api/ai/grokV2/models', (req, res) => {
    try {
        const models = grokV2.getAvailableModels();
        
        res.json({
            status: true,
            creator: "Ilhammmmm",
            models: models.map(model => ({
                name: model,
                id: grokV2.models[model],
                description: `Chat dengan model ${model}`
            })),
            default: 'grok',
            totalModels: models.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/grokV2/sessions', (req, res) => {
    try {
        const sessions = grokV2.activeSessions ? Array.from(grokV2.activeSessions.entries()).map(([id, data]) => ({
            id,
            model: data.model,
            lastActivity: new Date(data.lastActivity).toISOString(),
            ageSeconds: Math.floor((Date.now() - data.lastActivity) / 1000),
            messageCount: data.messageCount || 1
        })) : [];
        
        res.json({
            status: true,
            creator: "Ilhammmmm",
            activeSessions: grokV2.getActiveSessionCount(),
            sessions: sessions,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/grok', async (req, res) => {
    try {
        const { text, query, prompt } = req.query;
        const inputText = text || query || prompt;

        if (!inputText) {
            return res.status(400).json({
                success: false,
                message: "Missing parameter. Use 'text', 'query', or 'prompt'.",
                timestamp: new Date().toISOString()
            });
        }

        const result = await grok(inputText);
        res.json(result);
        
    } catch (error) {
        console.error('Grok error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Grok API error',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/ai/ciciai', async (req, res) => {
    const { text, question, q } = req.query;
    const inputText = text || question || q;
    
    if (!inputText) {
        return res.status(400).json({
            success: false,
            message: "Parameter 'text' atau 'question' diperlukan!",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const startTime = Date.now();
        const result = await ciciai(inputText);
        const responseTime = Date.now() - startTime;

        result.responseTime = `${responseTime}ms`;

        res.json(result);
        
    } catch (error) {
        console.error('CICI AI endpoint error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
            timestamp: new Date().toISOString(),
            responseTime: '0ms'
        });
    }
});

// ========== ENDPOINT TOOLS ==========
app.get('/api/tools/reactch', async (req, res) => {
    const { link, emojis } = req.query;
    const API_KEY_REACTCH = "8fd1e951c5d4ea509f69d5e7a1828b50e36befdebeef82ae210f13b7537e52eb";

    if (!API_KEY_REACTCH) {
        return res.status(500).json({
            success: false,
            error: "API Key untuk ReactCH belum diatur di server."
        });
    }

    if (!link || !emojis) {
        return res.status(400).json({
            success: false,
            error: "Parameter 'link' dan 'emojis' diperlukan.",
            example: `${req.protocol}://${req.get('host')}/api/tools/reactch?link=https://chat.whatsapp.com/xxxx&emojis=🔥,👍,❤️`
        });
    }

    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const identifier = `reactch_${userIP}`;

    try {
        const result = await reactToChannel(link, emojis, API_KEY_REACTCH, identifier);
        
        res.set({
            'X-RateLimit-Limit': '1 request per 5 minutes',
            'X-RateLimit-Reset': '300 seconds'
        });
        
        res.json(result);

    } catch (error) {
        console.error('[ReactCH Endpoint Error]', error.message);
        
        try {
            const errorData = JSON.parse(error.message);
            
            if (errorData.error && errorData.error.includes('Rate limit')) {
                return res.status(429).json({
                    success: false,
                    error: errorData.error,
                    rateLimitInfo: errorData.rateLimitInfo,
                    retryAfter: errorData.rateLimitInfo?.remainingTime || 300
                });
            }
            
            res.status(400).json(errorData);
        } catch (e) {
            res.status(500).json({
                success: false,
                error: 'Gagal memproses permintaan.',
                detail: error.message
            });
        }
    }
});

app.get('/api/tools/removebg', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ 
      error: "Parameter 'url' diperlukan",
      contoh: "/api/tools/removebg?url=https://example.com/foto.jpg"
    });
  }
  
  try {
    const result = await removeBgDirect(url);
    
    res.set({
      'Content-Type': result.contentType,
      'Content-Length': result.buffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    
    res.end(result.buffer);
    
  } catch (error) {
    console.error('Remove BG error:', error.message);
    res.status(500).json({
      error: 'Gagal menghapus background',
      catatan: 'Pastikan URL gambar valid dan dapat diakses'
    });
  }
});

app.post('/api/tools/remove-clothes/create', async (req, res) => {
    try {
        const { url, apikey } = req.body;
        const identifier = req.ip || 
                          req.headers['x-forwarded-for'] || 
                          req.connection.remoteAddress ||
                          `user_${Date.now()}`;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_PARAMETERS',
                message: 'URL parameter diperlukan'
            });
        }
        
        try {
            new URL(url);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'INVALID_URL',
                message: 'URL tidak valid'
            });
        }
        
        const result = await createRemoveClothesTask(url, identifier, apikey);
        res.json(result);
        
    } catch (error) {
        console.error('Create task error:', error.message);
        
        try {
            const errorData = JSON.parse(error.message);
            if (errorData.error === 'DAILY_LIMIT_EXCEEDED') {
                return res.status(429).json(errorData);
            }
            res.status(500).json(errorData);
        } catch {
            res.status(500).json({
                success: false,
                error: 'TASK_CREATION_ERROR',
                message: error.message
            });
        }
    }
});

app.get('/api/tools/remove-clothes/check/:taskId?', async (req, res) => {
    try {
        let taskId = req.params.taskId;
        
        if (!taskId || taskId === ':taskId') {
            taskId = req.query.taskId;
        }
        
        if (!taskId) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_TASK_ID',
                message: 'Task ID diperlukan',
                usage: {
                    path_param: '/api/tools/remove-clothes/check/YOUR_TASK_ID',
                    query_param: '/api/tools/remove-clothes/check?taskId=YOUR_TASK_ID'
                }
            });
        }
        
        const result = checkTaskStatus(taskId);
        res.json(result);
        
    } catch (error) {
        console.error('Check task error:', error.message);
        
        try {
            const errorData = JSON.parse(error.message);
            if (errorData.error === 'TASK_NOT_FOUND') {
                return res.status(404).json(errorData);
            }
            res.status(500).json(errorData);
        } catch {
            res.status(500).json({
                success: false,
                error: 'TASK_CHECK_ERROR',
                message: error.message
            });
        }
    }
});

app.get('/api/tools/remove-clothes', async (req, res) => {
    try {
        const { url, apikey } = req.query;
        const identifier = req.ip || 
                          req.headers['x-forwarded-for'] || 
                          req.connection.remoteAddress ||
                          `user_${Date.now()}`;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_PARAMETERS',
                message: 'URL parameter diperlukan'
            });
        }
        
        try {
            new URL(url);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'INVALID_URL',
                message: 'URL tidak valid'
            });
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Connection', 'keep-alive');
        
        req.setTimeout(10 * 60 * 1000);
        res.setTimeout(10 * 60 * 1000);
        
        const result = await removeClothes(url, identifier, apikey);
        res.json(result);
        
    } catch (error) {
        console.error('Remove clothes error:', error.message);
        
        try {
            const errorData = JSON.parse(error.message);
            if (errorData.error === 'DAILY_LIMIT_EXCEEDED') {
                return res.status(429).json(errorData);
            }
            res.status(500).json(errorData);
        } catch {
            res.status(500).json({
                success: false,
                error: 'PROCESSING_ERROR',
                message: error.message.includes('timeout') ? 
                    'Proses timeout. Coba lagi atau gunakan gambar lebih kecil.' : 
                    error.message
            });
        }
    }
});

app.get('/api/tools/remove-clothes/limit-status', async (req, res) => {
    try {
        const identifier = req.ip || 
                          req.headers['x-forwarded-for'] || 
                          req.connection.remoteAddress ||
                          `user_${Date.now()}`;
        
        const result = getLimitStatus(identifier);
        res.json(result);
        
    } catch (error) {
        console.error('Limit status error:', error.message);
        res.status(500).json({
            success: false,
            error: 'LIMIT_CHECK_ERROR',
            message: error.message
        });
    }
});

app.get('/api/tools/remove-clothes/queue-status', async (req, res) => {
    try {
        const result = getQueueStatus();
        res.json(result);
        
    } catch (error) {
        console.error('Queue status error:', error.message);
        res.status(500).json({
            success: false,
            error: 'QUEUE_CHECK_ERROR',
            message: error.message
        });
    }
});

app.get('/api/tools/remove-clothes/reset-limits', async (req, res) => {
    try {
        const { apikey } = req.query;
        
        if (apikey !== OWNER_API_KEY) {
            return res.status(403).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'API key tidak valid'
            });
        }
        
        const result = resetAllLimits();
        res.json(result);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'RESET_ERROR',
            message: error.message
        });
    }
});

app.get('/api/tools/ssweb', async (req, res) => {
    try {
        const { 
            url, 
            width = 1280, 
            height = 720, 
            full_page = false, 
            device_scale = 1,
            cache = true
        } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "Missing 'url' parameter. Please provide a website URL.",
                timestamp: new Date().toISOString(),
                example: "/api/tools/ssweb?url=https://google.com&width=1920&height=1080"
            });
        }

        // Validasi URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json({
                success: false,
                message: "Invalid URL format",
                timestamp: new Date().toISOString()
            });
        }

        // Cache check
        const cacheKey = `${url}_${width}_${height}_${full_page}_${device_scale}`;
        if (cache === 'true' && screenshotCache.has(cacheKey)) {
            const cached = screenshotCache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                return res.json({
                    success: true,
                    data: cached.data,
                    cached: true,
                    endpoint: '/api/tools/ssweb',
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Fetch screenshot
        const result = await fetchScreenshot(url, {
            width: parseInt(width),
            height: parseInt(height),
            full_page: full_page === 'true',
            device_scale: parseInt(device_scale)
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message || 'Failed to take screenshot',
                statusCode: result.statusCode,
                timestamp: new Date().toISOString()
            });
        }

        // Cache result jika diperlukan
        if (cache === 'true') {
            screenshotCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
        }

        res.json({
            success: true,
            data: result,
            cached: false,
            endpoint: '/api/tools/ssweb',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Screenshot error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/tools/ttsim', async (req, res) => {
  const { 
    text, 
    prompt, 
    model = 'sd1.5', 
    size = '1024x1024', 
    cache = 'true', 
    download,
    format = 'json', // tambah parameter format: json, base64, image
    base64 = 'false'
  } = req.query;
  
  const promptText = text || prompt;
  
  if (!promptText) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'text' atau 'prompt' diperlukan!",
      timestamp: new Date().toISOString()
    });
  }

  if (promptText.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Prompt terlalu panjang (maks 1000 karakter)",
      timestamp: new Date().toISOString()
    });
  }

  const cacheKey = `ttsim_${promptText}_${model}_${size}_${format}_${base64}`;
  const shouldCache = cache !== 'false';
  
  // Check cache untuk response JSON
  if (shouldCache && format === 'json') {
    const cached = imageCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  try {
    const startTime = Date.now();
    
    // Tentukan format output
    const returnBase64 = format === 'base64' || base64 === 'true';
    
    // Gunakan fungsi generateImage yang baru
    const result = await generateImage(promptText, returnBase64);
    
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: `Gagal generate gambar: ${result.message}`,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }

    // Handle different response formats
    if (format === 'base64' || base64 === 'true') {
      // Return base64 string dalam JSON
      const responseData = {
        success: true,
        data: {
          base64: result.data,
          type: result.contentType,
          size: result.size,
          prompt: promptText,
          generated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      };
      
      if (shouldCache) {
        imageCache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        });
      }
      
      return res.json(responseData);
      
    } else if (format === 'image') {
      // Return langsung sebagai image (default behavior)
      if (shouldCache) {
        imageCache.set(cacheKey, {
          buffer: result.buffer,
          contentType: result.contentType,
          contentLength: result.contentLength,
          timestamp: Date.now()
        });
      }

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Length', result.contentLength);
      res.setHeader('Cache-Control', 'public, max-age=600');
      res.setHeader('X-Generation-Time', `${responseTime}ms`);
      res.setHeader('X-Prompt', encodeURIComponent(promptText.substring(0, 100)));
      res.setHeader('X-Model', model);
      res.setHeader('X-Size', size);
      res.setHeader('X-Cache', shouldCache ? 'MISS' : 'DISABLED');
      
      if (download === 'true') {
        const filename = `image_${Date.now()}.${result.contentType.includes('png') ? 'png' : 'jpg'}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }
      
      return res.send(result.buffer);
      
    } else {
      // Default: return JSON dengan URL (untuk kompatibilitas)
      const tempUrl = `/api/tools/ttsim?text=${encodeURIComponent(promptText)}&format=image`;
      
      const responseData = {
        success: true,
        data: {
          image_url: `${BASE_URL}${tempUrl}`,
          download_url: `${BASE_URL}${tempUrl}&download=true`,
          base64_url: `${BASE_URL}/api/tools/ttsim?text=${encodeURIComponent(promptText)}&format=base64`,
          prompt: promptText,
          size: size,
          model: model,
          generated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      };
      
      if (shouldCache) {
        imageCache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        });
      }
      
      return res.json(responseData);
    }

  } catch (error) {
    console.error('TTSIM endpoint error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint khusus untuk mendapatkan base64
app.get('/api/tools/ttsim/base64', async (req, res) => {
  const { text, prompt } = req.query;
  const promptText = text || prompt;
  
  if (!promptText) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'text' atau 'prompt' diperlukan!"
    });
  }
  
  try {
    const result = await generateImage(promptText, true);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      type: 'base64',
      contentType: result.contentType,
      size: result.size,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 18. Tools: /api/tools/text-to-speech
app.get('/api/tools/text-to-speech', async (req, res) => {
    try {
        const { text, voice = 'Dylan' } = req.query;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: "Missing 'text' parameter. Please provide text to convert to speech.",
                timestamp: new Date().toISOString(),
                example: "/api/tools/text-to-speech?text=Hello world&voice=Dylan"
            });
        }

        const audioUrl = await qwentts(text, voice);
        
        res.json({
            success: true,
            data: {
                audio_url: audioUrl,
                text: text,
                voice: voice,
                voices_available: ['Dylan', 'Sunny', 'Jada', 'Cherry', 'Ethan', 'Serena', 'Chelsie']
            },
            endpoint: '/api/tools/text-to-speech',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Text-to-speech error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to convert text to speech';
        
        if (error.message.includes('Text is required') || error.message.includes('Available voices')) {
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// ========== ENDPOINT DOWNLOAD ==========
app.get('/api/download/tiktok', async (req, res) => {
  const url = req.query.url;
  const quality = req.query.quality || 'no_watermark';
  const format = req.query.format || 'json';
  
  if (!url) {
    return res.status(400).json({ 
      error: "Parameter 'url' diperlukan.",
      status: false,
      usage: {
        required: "url (URL TikTok)",
        optional: "quality (no_watermark|hd_no_watermark), format (json|direct)",
        example: "/api/download/tiktok?url=https://vt.tiktok.com/xxxx&quality=hd_no_watermark"
      },
      supported_urls: [
        "https://www.tiktok.com/@username/video/123456789",
        "https://vt.tiktok.com/ABC123/",
        "https://vm.tiktok.com/XYZ789/"
      ]
    });
  }

  try {
    const downloader = new TikTokDownloader();
    
    if (format === 'json') {
      const videoInfo = await downloader.getVideoInfo(url);
      
      if (!videoInfo.success) {
        return res.status(404).json({ 
          error: "Tidak dapat menemukan video.",
          status: false,
          suggestions: [
            "Periksa kembali URL TikTok",
            "Video mungkin dihapus atau di-private",
            "Pastikan URL benar dan tidak expired"
          ]
        });
      }
      
      const responseData = {
        status: true,
        creator: "Ilhammmmm",
        source: videoInfo.source,
        result: {
          id: videoInfo.result.id,
          author: videoInfo.result.author,
          title: videoInfo.result.title,
          region: videoInfo.result.region,
          duration: {
            seconds: videoInfo.result.duration,
            formatted: formatDuration(videoInfo.result.duration)
          },
          statistics: {
            views: {
              count: videoInfo.result.play_count,
              formatted: formatNumber(videoInfo.result.play_count)
            },
            comments: {
              count: videoInfo.result.comment_count,
              formatted: formatNumber(videoInfo.result.comment_count)
            },
            shares: {
              count: videoInfo.result.share_count,
              formatted: formatNumber(videoInfo.result.share_count)
            },
            downloads: {
              count: videoInfo.result.download_count,
              formatted: formatNumber(videoInfo.result.download_count)
            }
          },
          create_time: videoInfo.result.create_time,
          thumbnail: videoInfo.result.thumbnail,
          medias: videoInfo.result.medias,
          music_info: videoInfo.result.music_info
        },
        download_urls: {
          no_watermark: videoInfo.result.medias?.find(m => m.quality === 'no_watermark')?.url,
          hd_no_watermark: videoInfo.result.medias?.find(m => m.quality === 'hd_no_watermark')?.url,
          audio: videoInfo.result.medias?.find(m => m.type === 'audio')?.url,
          watermark: videoInfo.result.medias?.find(m => m.quality === 'watermark')?.url
        },
        timestamp: videoInfo.timestamp
      };
      
      return res.json(responseData);
    } else if (format === 'direct') {
      const result = await downloader.getDownloadLink(url, quality);
      
      if (!result.success) {
        return res.status(404).json({ 
          error: "Tidak dapat menemukan video untuk didownload",
          status: false
        });
      }
      
      return res.redirect(result.video_url);
    }

  } catch (error) {
    console.error('TikTok Download Error:', error.message);
    
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.message.includes('Timeout')) {
      statusCode = 408;
      errorMessage = 'Timeout: Server tidak merespons. Coba lagi nanti.';
    } else if (error.message.includes('tidak ditemukan') || error.message.includes('Gagal mendapatkan')) {
      statusCode = 404;
      errorMessage = 'Video tidak ditemukan. URL mungkin tidak valid atau video telah dihapus.';
    } else if (error.message.includes('URL harus dari TikTok')) {
      statusCode = 400;
      errorMessage = error.message;
    }
    
    return res.status(statusCode).json({
      error: errorMessage,
      status: false,
      original_url: url,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/download/search/tiktok', async (req, res) => {
  const query = req.query.q || req.query.query;
  const count = parseInt(req.query.count) || 10;
  const cursor = parseInt(req.query.cursor) || 0;
  const page = parseInt(req.query.page) || 1;
  
  if (!query) {
    return res.status(400).json({ 
      error: "Parameter 'q' atau 'query' diperlukan.",
      status: false,
      usage: {
        required: "q (query pencarian)",
        optional: "count (1-50), cursor (pagination), page (pagination)",
        example: "/api/search/tiktok?q=cosplayer&count=10&page=1"
      }
    });
  }

  const validCount = Math.min(Math.max(1, count), 50);

  try {
    const downloader = new TikTokDownloader();
    const searchResult = await downloader.searchVideos(query, validCount, cursor);
    
    if (!searchResult.success || searchResult.count === 0) {
      return res.status(404).json({ 
        error: `Tidak ditemukan hasil untuk "${query}"`,
        status: false,
        query: query
      });
    }
    
    const responseData = {
      status: true,
      creator: "Ilhammmmm",
      search: {
        query: query,
        total_results: searchResult.count,
        has_more: searchResult.has_more,
        cursor: searchResult.cursor,
        page: page,
        next_cursor: searchResult.has_more ? searchResult.cursor : null
      },
      videos: searchResult.results.map(video => ({
        id: video.id,
        title: video.title,
        author: {
          nickname: video.author.nickname,
          username: video.author.unique_id,
          avatar: video.author.avatar
        },
        duration: {
          seconds: video.duration,
          formatted: formatDuration(video.duration)
        },
        statistics: {
          views: {
            count: video.play_count,
            formatted: formatNumber(video.play_count)
          },
          comments: {
            count: video.comment_count,
            formatted: formatNumber(video.comment_count)
          },
          shares: {
            count: video.share_count,
            formatted: formatNumber(video.share_count)
          }
        },
        thumbnail: video.thumbnail,
        download_url: video.medias?.find(m => m.quality === 'no_watermark')?.url,
        hd_url: video.medias?.find(m => m.quality === 'hd_no_watermark')?.url,
        audio_url: video.medias?.find(m => m.type === 'audio')?.url
      })),
      pagination: {
        current_page: page,
        results_per_page: validCount,
        has_next_page: searchResult.has_more,
        next_cursor: searchResult.has_more ? searchResult.cursor : null
      },
      timestamp: searchResult.timestamp
    };
    
    return res.json(responseData);

  } catch (error) {
    console.error('TikTok Search Error:', error.message);
    
    return res.status(500).json({
      error: error.message || 'Gagal melakukan pencarian',
      status: false,
      query: query,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/download/spotify', async (req, res) => {
    try {
        const { url, track_id } = req.query;
        
        // Support both direct URL and track ID
        let spotifyUrl = url;
        if (!url && track_id) {
            spotifyUrl = `https://open.spotify.com/track/${track_id}`;
        }

        if (!spotifyUrl) {
            return res.status(400).json({
                success: false,
                message: "Missing 'url' or 'track_id' parameter. Please provide Spotify URL or Track ID.",
                timestamp: new Date().toISOString(),
                example: "/api/download/spotify?url=https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
            });
        }

        if (!spotifyUrl.includes('open.spotify.com')) {
            return res.status(400).json({
                success: false,
                message: "Invalid Spotify URL. Must be from open.spotify.com",
                timestamp: new Date().toISOString()
            });
        }

        const result = await spotifyDl(spotifyUrl);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.message || 'Failed to download Spotify track',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: result,
            endpoint: '/api/download/spotify',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Spotify download error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process Spotify download',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/download/aio', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "Missing 'url' parameter. Please provide a video URL.",
                timestamp: new Date().toISOString(),
                example: "/api/download/aio?url=https://tiktok.com/@user/video/12345"
            });
        }

        if (!url.includes('https://')) {
            return res.status(400).json({
                success: false,
                message: "Invalid URL. Must start with 'https://'",
                timestamp: new Date().toISOString()
            });
        }

        const result = await aiopro(url);
        
        // Cek jika result ada error
        if (result.error) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Failed to process URL',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: result,
            endpoint: '/api/download/aio',
            timestamp: new Date().toISOString(),
            supported_platforms: [
                'TikTok', 'Instagram', 'YouTube', 'Facebook', 
                'Twitter/X', 'Snapchat', 'Pinterest', 'Likee'
            ]
        });
        
    } catch (error) {
        console.error('AllInOne error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to download content';
        
        if (error.message.includes('Invalid url') || error.message.includes('not found')) {
            statusCode = 400;
        } else if (error.message.includes('token not found') || error.message.includes('Token')) {
            statusCode = 503;
            errorMessage = 'Service temporarily unavailable';
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/download/pinterest', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "Missing 'url' parameter. Please provide a Pinterest URL.",
                timestamp: new Date().toISOString(),
                example: "/api/download/pinterest?url=https://pin.it/example"
            });
        }

        if (!url.includes('pin.it')) {
            return res.status(400).json({
                success: false,
                message: "Invalid Pinterest URL. Must contain 'pin.it'",
                timestamp: new Date().toISOString()
            });
        }

        const result = await pindl(url);
        
        res.json({
            success: true,
            data: result,
            endpoint: '/api/download/pinterest',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Pinterest error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to download Pinterest content';
        
        if (error.message.includes('Invalid url') || error.message.includes('not found')) {
            statusCode = 400;
        } else if (error.message.includes('rate limit') || error.response?.status === 429) {
            statusCode = 429;
            errorMessage = 'Rate limit exceeded. Please try again later.';
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// ========== ENDPOINT STALK ==========
app.get('/api/stalk/instagram', async (req, res) => {
    const { username } = req.query;
    
    if (!username) {
        return res.status(400).json({
            success: false,
            message: "Parameter 'username' diperlukan!",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const startTime = Date.now();
        const result = await igstalk(username);
        const responseTime = Date.now() - startTime;

        if (result.success) {
            result.responseTime = `${responseTime}ms`;
        }

        res.json(result);
        
    } catch (error) {
        console.error('Instagram stalk endpoint error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
            timestamp: new Date().toISOString(),
            responseTime: '0ms'
        });
    }
});

app.get('/api/stalk/tiktok', async (req, res) => {
    const { username } = req.query;
    
    if (!username) {
        return res.status(400).json({
            success: false,
            message: "Parameter 'username' diperlukan!",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const startTime = Date.now();
        const result = await ttstalk(username);
        const responseTime = Date.now() - startTime;

        if (result.success) {
            result.responseTime = `${responseTime}ms`;
        }

        res.json(result);
        
    } catch (error) {
        console.error('tiktok stalk endpoint error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
            timestamp: new Date().toISOString(),
            responseTime: '0ms'
        });
    }
});

app.get('/api/stalk/twitter', async (req, res) => {
    try {
        const { username, id } = req.query;
        const target = username || id;

        if (!target) {
            return res.status(400).json({
                success: false,
                message: "Missing 'username' or 'id' parameter. Please provide Twitter username.",
                timestamp: new Date().toISOString(),
                example: "/api/social/twitter?username=MrBeast"
            });
        }

        const result = await twitterstalk(target);
        
        if (result.status === 'eror') {
            return res.status(404).json({
                success: false,
                message: result.msg || 'Twitter user not found',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: result,
            endpoint: '/api/social/twitter',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Twitter stalk error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch Twitter profile',
            timestamp: new Date().toISOString()
        });
    }
});

// ========== ENDPOINT UPLOADER ==========
app.post('/api/uploader/top4top', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "File diperlukan! Silahkan upload file melalui form-data dengan key 'file'",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const filePath = req.file.path;
        const startTime = Date.now();
        
        const result = await top4top(filePath);
        const responseTime = Date.now() - startTime;

        if (result.success) {
            result.file_info = {
                original_name: req.file.originalname,
                mime_type: req.file.mimetype,
                size: req.file.size
            };
            result.responseTime = `${responseTime}ms`;
        }

        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            console.error('Error deleting temp file:', e.message);
        }

        res.json(result);

    } catch (error) {
        console.error('Top4Top endpoint error:', error);
        
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {}
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
            timestamp: new Date().toISOString(),
            responseTime: '0ms'
        });
    }
});

app.post('/api/uploader/catbox', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "File diperlukan! Silahkan upload file melalui form-data dengan key 'file'",
      timestamp: new Date().toISOString()
    });
  }

  const startTime = Date.now();
  const filePath = req.file.path;

  try {
    const catboxUrl = await uploadCatbox(filePath);
    
    const fileSize = fs.statSync(filePath).size;
    const responseTime = Date.now() - startTime;

    const result = {
      success: true,
      creator: "Ilhammmmm",
      result: {
        url: catboxUrl,
        filename: req.file.originalname,
        size: fileSize,
        size_formatted: formatFileSize(fileSize),
        mime_type: req.file.mimetype,
        upload_time: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    };

    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error deleting temp file:', e.message);
    }

    res.json(result);

  } catch (error) {
    console.error('Catbox upload error:', error);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Error deleting temp file on error:', e.message);
      }
    }

    res.status(500).json({
      success: false,
      message: "Gagal mengupload file ke Catbox",
      error: error.message,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// ========== ENDPOINT RANDOM IMAGE ==========
app.get('/api/random-image/BlueArchive', async (req, res) => {
    try {
        const { character, char, list, search, q } = req.query;
        
        const bluArsip = new BluArsip();

        // Endpoint untuk list semua karakter
        if (list === 'true' || req.path === '/api/image/BlueArchive/list') {
            const characters = await bluArsip.list();
            return res.json({
                success: true,
                data: characters,
                count: characters.length,
                endpoint: '/api/image/BlueArchive?list=true',
                timestamp: new Date().toISOString()
            });
        }

        // Endpoint untuk mencari karakter spesifik
        const charName = character || char || search || q;
        
        if (!charName) {
            return res.status(400).json({
                success: false,
                message: "Missing character name. Use 'character', 'char', 'search', or 'q' parameter.",
                timestamp: new Date().toISOString(),
                example: "/api/random-image/BlueArchive?character=arona"
            });
        }

        const characterData = await bluArsip.char(charName);
        
        res.json({
            success: true,
            data: characterData,
            endpoint: '/api/random-image/BlueArchive',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Blue Archive error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to fetch Blue Archive data';
        
        if (error.message.includes('not found') || error.message.includes('not exist')) {
            statusCode = 404;
            errorMessage = 'Character not found. Use ?list=true to see available characters.';
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// ========== ENDPOINT ANIME ==========
app.get('/api/anime/search', async (req, res) => {
    try {
        const { query, q, page = '0', count = '25' } = req.query;
        const searchQuery = query || q;

        if (!searchQuery) {
            return res.status(400).json({
                success: false,
                message: "Missing search query. Use 'query' or 'q' parameter.",
                timestamp: new Date().toISOString(),
                example: "/api/anime/search?query=naruto"
            });
        }

        const mobinime = new Mobinime();
        const results = await mobinime.search(searchQuery, { page, count });
        
        res.json({
            success: true,
            data: results,
            endpoint: '/api/anime/search',
            query: searchQuery,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Anime search error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to search anime',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/anime/stream', async (req, res) => {
    try {
        const { id, epsid, episode_id, quality = 'HD' } = req.query;
        const episodeId = epsid || episode_id;

        if (!id || !episodeId) {
            return res.status(400).json({
                success: false,
                message: "Missing 'id' and 'epsid' parameters. Both are required.",
                timestamp: new Date().toISOString(),
                example: "/api/anime/stream?id=123&epsid=456"
            });
        }

        const mobinime = new Mobinime();
        const streamUrl = await mobinime.stream(id, episodeId, { quality });
        
        res.json({
            success: true,
            data: {
                stream_url: streamUrl,
                anime_id: id,
                episode_id: episodeId,
                quality: quality
            },
            endpoint: '/api/anime/stream',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Anime stream error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to get stream URL';
        
        if (error.message.includes('required') || error.message.includes('not found')) {
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// ========== ENDPOINT ASIAN TOLICK ==========
app.get('/api/random-image/asiantolick', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 1;
        
        // Validate count
        if (count < 1 || count > 10) {
            return res.status(400).json({
                success: false,
                message: "Count must be between 1 and 10",
                timestamp: new Date().toISOString()
            });
        }
        
        // Create instance
        const scraper = new SimpleAsianTolick();
        const results = [];
        
        // Get multiple random albums
        for (let i = 0; i < count; i++) {
            try {
                const randomAlbum = await scraper.getRandom();
                
                results.push({
                    title: randomAlbum.title,
                    totalPics: randomAlbum.totalImages,
                    images: randomAlbum.images || [],
                    url: randomAlbum.url,
                    count: i + 1
                });
            } catch (error) {
                console.error(`Error getting random album ${i + 1}:`, error.message);
                // Skip this one and continue
                if (count === 1 && results.length === 0) {
                    // If only 1 requested and failed, return error
                    return res.status(500).json({
                        success: false,
                        message: "Failed to get random album",
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        // If no results
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No albums found",
                timestamp: new Date().toISOString()
            });
        }
        
        // If count is 1, return single object (not array)
        if (count === 1) {
            return res.json({
                success: true,
                data: results[0],
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: results,
            total: results.length,
            requested: count,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint search untuk asiantolick
app.get('/api/random-image/search', async (req, res) => {
    try {
        const { q: query, limit = 20 } = req.query;
        
        // Validate query
        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Query parameter 'q' is required",
                timestamp: new Date().toISOString()
            });
        }
        
        // Validate limit
        const parsedLimit = parseInt(limit);
        if (parsedLimit < 1 || parsedLimit > 50) {
            return res.status(400).json({
                success: false,
                message: "Limit must be between 1 and 50",
                timestamp: new Date().toISOString()
            });
        }
        
        // Create instance and perform search
        const scraper = new SimpleAsianTolick();
        const searchResults = await scraper.search(query);
        
        // Limit results
        const limitedResults = searchResults.slice(0, parsedLimit);
        
        res.json({
            success: true,
            query,
            results: limitedResults,
            total: searchResults.length,
            returned: limitedResults.length,
            limit: parsedLimit,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ========== ENDPOINT ANHMOE ==========
app.get('/api/random-image/anhmoe', async (req, res) => {
    try {
        const anh = new Anhmoe();
        const categories = [
            'sfw', 'nsfw', 'moe', 'ai-picture', 'hentai'
        ];
        
        // Random category
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        
        // Get random page (1-5)
        const randomPage = Math.floor(Math.random() * 5) + 1;
        const results = await anh.getCategory(randomCategory, `/category/${randomCategory}?page=${randomPage}`);
        
        if (!results.contents || results.contents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No images found'
            });
        }
        
        // Get random image from results
        const randomIndex = Math.floor(Math.random() * results.contents.length);
        const randomImage = results.contents[randomIndex];
        
        // Check if image exists
        if (!randomImage || !randomImage.viewLink) {
            return res.status(404).json({
                success: false,
                message: 'Failed to get random image'
            });
        }
        
        // Return only essential data
        const response = {
            success: true,
            data: {
                image: randomImage.image ? randomImage.image.url : randomImage.viewLink,
                title: randomImage.title || 'Random Image',
                category: randomCategory,
                type: randomImage.type || 'image',
                uploadBy: randomImage.uploadBy || 'Unknown',
                uploaded: randomImage.image?.uploaded || 'Unknown'
            },
            info: {
                totalResults: results.contents.length,
                category: randomCategory,
                page: randomPage
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Random image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get random image',
            error: error.message
        });
    }
});

// 22. Tools: /api/tools/bypassai
app.get('/api/tools/bypassai', async (req, res) => {
    try {
        const { text, content } = req.query;
        const inputText = text || content;

        if (!inputText) {
            return res.status(400).json({
                success: false,
                message: "Missing 'text' or 'content' parameter. Please provide text to bypass AI detection.",
                timestamp: new Date().toISOString(),
                example: "/api/tools/bypassai?text=This is AI generated content"
            });
        }

        const humanizedText = await bypassai(inputText);
        
        res.json({
            success: true,
            data: {
                original_text: inputText,
                humanized_text: humanizedText,
                original_length: inputText.length,
                humanized_length: humanizedText.length
            },
            endpoint: '/api/tools/bypassai',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Bypass AI error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Failed to bypass AI detection';
        
        if (error.message.includes('Text is required') || error.message.includes('Missing')) {
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/tools/bypassai', async (req, res) => {
    try {
        const { text, content } = req.body;
        const inputText = text || content;

        if (!inputText) {
            return res.status(400).json({
                success: false,
                message: "Missing 'text' or 'content' in request body.",
                timestamp: new Date().toISOString()
            });
        }

        // Limit text length untuk mencegah abuse
        if (inputText.length > 10000) {
            return res.status(400).json({
                success: false,
                message: "Text is too long. Maximum 10,000 characters.",
                timestamp: new Date().toISOString()
            });
        }

        const humanizedText = await bypassai(inputText);
        
        res.json({
            success: true,
            data: {
                original_text: inputText,
                humanized_text: humanizedText,
                original_length: inputText.length,
                humanized_length: humanizedText.length
            },
            endpoint: '/api/tools/bypassai',
            method: 'POST',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Bypass AI POST error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to bypass AI detection',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/tools/toanime', async (req, res) => {
    try {
        const { prompt, image_description, text, style = 'anime' } = req.query;
        const inputPrompt = prompt || image_description || text;

        if (!inputPrompt) {
            return res.status(400).json({
                success: false,
                message: "Missing prompt. Use 'prompt', 'image_description', or 'text' parameter.",
                example: "/api/tools/toanime?prompt=a beautiful sunset&style=digital-art",
                timestamp: new Date().toISOString()
            });
        }

        // ⬇️ sekarang return OBJECT, bukan URL
        const result = await unrestrictedai(inputPrompt, style);

        res.json({
            success: true,
            data: {
                image_url: result.cdnUrl || result.rawUrl,
                file: result.fileName,
                repo: result.repo,
                prompt: inputPrompt,
                style,
                available_styles: [
                    'photorealistic',
                    'digital-art',
                    'impressionist',
                    'anime',
                    'fantasy',
                    'sci-fi',
                    'vintage'
                ]
            },
            endpoint: '/api/tools/toanime',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ToAnime error:', error);

        let statusCode = 500;
        let errorMessage = error.message || 'Failed to generate anime image';

        if (
            error.message.includes('Prompt is required') ||
            error.message.includes('Available styles')
        ) {
            statusCode = 400;
        } else if (
            error.message.includes('No result found') ||
            error.message.includes('Nonce not found')
        ) {
            statusCode = 503;
            errorMessage = 'Service temporarily unavailable. Please try again later.';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// ========== HANDLER 404 ==========
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '404 Not Found: Halaman atau Endpoint tidak ditemukan.',
    timestamp: new Date().toISOString()
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`By Ilhammmmm Gantenggggg`);
});
