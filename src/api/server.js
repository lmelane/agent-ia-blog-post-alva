import express from 'express';
import { getThumbnailBySlug } from '../utils/database.js';
import logger from '../utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint pour servir les thumbnails avec extension .png
app.get('/images/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Extract slug from filename (remove date prefix and .png extension)
    // Example: 2025-10-04-comment-lia-transforme.png -> comment-lia-transforme
    const slug = filename
      .replace(/^\d{4}-\d{2}-\d{2}-/, '') // Remove date prefix
      .replace(/\.png$/, '');              // Remove .png extension
    
    const thumbnail = await getThumbnailBySlug(slug);
    
    if (!thumbnail) {
      logger.warn(`Thumbnail not found for slug: ${slug} (filename: ${filename})`);
      return res.status(404).send('Thumbnail not found');
    }
    
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Content-Disposition', `inline; filename="${filename}"`);
    res.send(thumbnail.data);
  } catch (error) {
    logger.error('Error serving thumbnail', error);
    res.status(500).send('Internal server error');
  }
});

// Legacy endpoint (redirect to new format)
app.get('/api/thumbnail/:slug', (req, res) => {
  res.redirect(301, `/images/${req.params.slug}.png`);
});

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
  app.listen(PORT, () => {
    logger.success(`🚀 API Server running on port ${PORT}`);
  });
}

export default app;
