import express from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';
import config from '../config.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration du dossier de stockage des images
const storagePath = process.env.IMAGES_STORAGE_PATH || path.join(process.cwd(), 'public', 'images');

// Servir les fichiers statiques (images)
// L'URL sera /images/filename.png
app.use('/images', express.static(storagePath));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/articles', async (req, res) => {
  try {
    const { getAllArticles } = await import('../utils/database.js');
    const articles = await getAllArticles(50);
    res.json({ articles });
  } catch (error) {
    logger.error('Error getting articles', error);
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
    logger.info(`📁 Serving images from: ${storagePath}`);
  });
}

export default app;
