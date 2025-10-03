import express from 'express';
import { getThumbnailBySlug } from '../utils/database.js';
import logger from '../utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint pour servir les thumbnails avec extension .png
app.get('/images/:slug.png', async (req, res) => {
  try {
    const { slug } = req.params;
    const thumbnail = await getThumbnailBySlug(slug);
    
    if (!thumbnail) {
      return res.status(404).send('Thumbnail not found');
    }
    
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Content-Disposition', `inline; filename="${slug}.png"`);
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
