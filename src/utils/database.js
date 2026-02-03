import pg from 'pg';
import logger from './logger.js';
import config from '../config.js';
// config.baseUrl is used to build absolute image URLs

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Initialize database tables
 */
export async function initDatabase() {
  try {
    // 0. Cleanup (Optional: Remove if you want to preserve data)
    // "Il faut l'initialité de A à Z du coup" -> We reset schema
    logger.info('⚠️ Resetting database schema (DROP TABLES)...');
    await pool.query('DROP TABLE IF EXISTS articles CASCADE');
    await pool.query('DROP TABLE IF EXISTS categories CASCADE');

    // 1. Table Categories
    await pool.query(`
      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Table Articles
    await pool.query(`
      CREATE TABLE articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        excerpt TEXT,
        content TEXT,
        thumbnail_url VARCHAR(1000),
        thumbnail_path VARCHAR(1000), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP,
        metadata JSONB
      );
      
      CREATE INDEX idx_articles_slug ON articles(slug);
      CREATE INDEX idx_articles_category ON articles(category_id);
      CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
    `);

    // 3. Seed Categories
    logger.info('Seeding categories...');
    const categories = config.categories || [];
    for (const cat of categories) {
      const slug = cat.toLowerCase()
        .replace(/[éèê]/g, 'e')
        .replace(/[àâ]/g, 'a')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
        
      await pool.query(
        'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cat, slug]
      );
    }
    logger.success(`Seeded ${categories.length} categories`);
    
    logger.success('✅ Database initialized');
  } catch (error) {
    logger.error('Failed to initialize database', error);
    throw error;
  }
}

/**
 * Get or create category
 */
async function getOrCreateCategory(categoryName) {
  if (!categoryName) return null;
  
  const slug = categoryName.toLowerCase()
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  try {
    // Try to find
    const res = await pool.query('SELECT id FROM categories WHERE name = $1 OR slug = $2', [categoryName, slug]);
    if (res.rows.length > 0) return res.rows[0].id;

    // Create if not exists
    const insert = await pool.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id',
      [categoryName, slug]
    );
    return insert.rows[0].id;
  } catch (err) {
    logger.warn(`Failed to handle category ${categoryName}`, err);
    return null;
  }
}

/**
 * Save article to database
 */
export async function saveArticle(articleData) {
  const {
    title,
    slug,
    category, // Name string
    excerpt,
    content,
    thumbnailFilename, // Used to build URL/Path
    thumbnailPath, // Absolute storage path
    metadata,
  } = articleData;

  try {
    // Resolve Category ID
    const categoryId = await getOrCreateCategory(category);

    // Build URL (Absolute URL for NextJS frontend)
    // Uses BASE_URL from config to create full URL like https://agent.beauchoix.fr/images/xxx.png
    const baseUrl = config.baseUrl || '';
    const relativePath = thumbnailFilename ? `/images/${thumbnailFilename}` : null;
    const publicUrl = relativePath ? `${baseUrl}${relativePath}` : null;

    const result = await pool.query(
      `INSERT INTO articles (
        title, slug, category_id, excerpt, content, 
        thumbnail_url, thumbnail_path, 
        published_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        thumbnail_url = EXCLUDED.thumbnail_url,
        thumbnail_path = EXCLUDED.thumbnail_path,
        metadata = EXCLUDED.metadata,
        published_at = NOW()
      RETURNING id, slug`,
      [
        title,
        slug,
        categoryId,
        excerpt,
        content,
        publicUrl,
        thumbnailPath,
        JSON.stringify(metadata),
      ]
    );

    const articleId = result.rows[0].id;
    logger.success(`Article saved to database: ${slug} (ID: ${articleId})`);
    
    return {
      id: articleId,
      slug: result.rows[0].slug,
      thumbnailUrl: publicUrl,
    };
  } catch (error) {
    logger.error('Failed to save article to database', error);
    throw error;
  }
}

/**
 * Get thumbnail info by slug (Legacy / API support)
 */
export async function getThumbnailBySlug(slug) {
  try {
    const result = await pool.query(
      'SELECT thumbnail_path, thumbnail_url FROM articles WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get thumbnail info', error);
    return null;
  }
}

/**
 * Get all articles
 */
export async function getAllArticles(limit = 50) {
  try {
    const result = await pool.query(
      `SELECT a.id, a.title, a.slug, c.name as category, a.excerpt, a.thumbnail_url, 
              a.published_at, a.created_at 
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       ORDER BY a.published_at DESC 
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
