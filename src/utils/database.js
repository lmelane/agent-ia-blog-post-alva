import pg from 'pg';
import logger from './logger.js';

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:QRJDUsvAsbcJbBXysGnqXKYdFxygsTxs@switchback.proxy.rlwy.net:18058/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Initialize database tables
 */
export async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        category VARCHAR(100),
        excerpt TEXT,
        content TEXT,
        thumbnail_data BYTEA,
        thumbnail_url VARCHAR(1000),
        thumbnail_filename VARCHAR(500),
        webflow_item_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP,
        metadata JSONB
      );
      
      CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
      CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
    `);
    
    logger.success('✅ Database initialized');
  } catch (error) {
    logger.error('Failed to initialize database', error);
    throw error;
  }
}

/**
 * Save article to database
 */
export async function saveArticle(articleData) {
  const {
    title,
    slug,
    category,
    excerpt,
    content,
    thumbnailData,
    thumbnailFilename,
    webflowItemId,
    metadata,
  } = articleData;

  try {
    const result = await pool.query(
      `INSERT INTO articles (
        title, slug, category, excerpt, content, 
        thumbnail_data, thumbnail_filename, webflow_item_id, 
        published_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      RETURNING id, slug`,
      [
        title,
        slug,
        category,
        excerpt,
        content,
        thumbnailData,
        thumbnailFilename,
        webflowItemId,
        JSON.stringify(metadata),
      ]
    );

    const articleId = result.rows[0].id;
    
    // Generate public thumbnail URL
    const thumbnailUrl = `${process.env.PUBLIC_URL || 'https://web-production-da83a.up.railway.app'}/api/thumbnail/${slug}`;
    
    // Update with thumbnail URL
    await pool.query(
      'UPDATE articles SET thumbnail_url = $1 WHERE id = $2',
      [thumbnailUrl, articleId]
    );

    logger.success(`Article saved to database: ${slug}`);
    
    return {
      id: articleId,
      slug: result.rows[0].slug,
      thumbnailUrl,
    };
  } catch (error) {
    logger.error('Failed to save article to database', error);
    throw error;
  }
}

/**
 * Get thumbnail by slug
 */
export async function getThumbnailBySlug(slug) {
  try {
    const result = await pool.query(
      'SELECT thumbnail_data, thumbnail_filename FROM articles WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      data: result.rows[0].thumbnail_data,
      filename: result.rows[0].thumbnail_filename,
    };
  } catch (error) {
    logger.error('Failed to get thumbnail', error);
    return null;
  }
}

/**
 * Get all articles
 */
export async function getAllArticles(limit = 50) {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, category, excerpt, thumbnail_url, 
              published_at, created_at 
       FROM articles 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get articles', error);
    return [];
  }
}

/**
 * Check if article exists by slug
 */
export async function articleExists(slug) {
  try {
    const result = await pool.query(
      'SELECT id FROM articles WHERE slug = $1',
      [slug]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Failed to check article existence', error);
    return false;
  }
}

export default {
  initDatabase,
  saveArticle,
  getThumbnailBySlug,
  getAllArticles,
  articleExists,
};
