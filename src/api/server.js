import express from 'express';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import config from '../config.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. CORS Strict (Allow only beauchoix.fr)
const allowedOrigins = ['https://www.beauchoix.fr', 'https://beauchoix.fr'];
// Allow localhost in development
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://localhost:3001');
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) IF we want, 
    // but for strict security for a website, we might want to enforce origin.
    // However, server-to-server calls (like from Next.js SSR) might not have an origin header 
    // depending on how they are made, or might be null.
    // For now, we strictly allow allowedOrigins or no origin (if it's a direct API call with auth).
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET'], // We only read articles for now
  allowedHeaders: ['Content-Type', 'X-API-KEY'],
}));

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// 4. API Key Authentication Middleware
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const configuredKey = process.env.API_SECRET_KEY;

  if (!configuredKey) {
    logger.error('API_SECRET_KEY is not configured in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!apiKey || apiKey !== configuredKey) {
    logger.warn(`Unauthorized API access attempt from IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Configuration du dossier de stockage des images (Fallback local)
const storagePath = process.env.IMAGES_STORAGE_PATH || path.join(process.cwd(), 'public', 'images');

// Servir les fichiers statiques (images) - Optionnel si on utilise Cloudinary
// On peut aussi protéger les images avec un middleware si nécessaire, 
// mais généralement les images sont publiques pour le CDN/Cache.
// Si on veut strict, on peut retirer ça ou le protéger. 
// Pour l'instant on laisse public pour que le site puisse les charger via <img src="...">
app.use('/images', express.static(storagePath));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protect API endpoints
app.get('/api/articles', authenticateAPI, async (req, res) => {
  try {
    const { getAllArticles } = await import('../utils/database.js');
    const articles = await getAllArticles(50);
    res.json({ articles });
  } catch (error) {
    logger.error('Error getting articles', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/articles/:slug', authenticateAPI, async (req, res) => {
  try {
    const { getArticleBySlug } = await import('../utils/database.js');
    const article = await getArticleBySlug(req.params.slug);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json({ article });
  } catch (error) {
    logger.error('Error getting article', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export function startServer() {
  // Ensure storage directory exists
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
    logger.info(`Created storage directory: ${storagePath}`);
  }
  
  app.listen(PORT, () => {
    logger.success(`🚀 API Server running on port ${PORT}`);
    logger.info(`�️  Security: CORS restricted to ${allowedOrigins.join(', ')}`);
    logger.info(`🔑 Auth: API Key protection enabled`);
  });
}

export default app;
