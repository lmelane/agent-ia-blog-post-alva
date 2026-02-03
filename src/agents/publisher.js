import fs from 'fs/promises';
import logger from '../utils/logger.js';
import { saveArticle } from '../utils/database.js';

/**
 * Publisher Agent - Publishes articles to PostgreSQL Database (Railway)
 * Removes Webflow dependency. Stores content as clean Markdown.
 */
export class PublisherAgent {
  constructor() {
    // No specific config needed for DB as it uses shared env vars (DATABASE_URL)
  }

  /**
   * Check if Publisher is configured
   * Always true as we rely on the shared DB connection
   */
  isConfigured() {
    return !!process.env.DATABASE_URL;
  }

  /**
   * Clean article content for Database
   * Removes YAML front-matter to store only the Markdown body
   */
  cleanArticleContent(article) {
    // Remove YAML front-matter (everything between the first two ---)
    let cleaned = article.replace(/^---[\s\S]*?---\n/m, '');
    return cleaned.trim();
  }

  /**
   * Run the publisher agent
   */
  async run(article, frontMatter) {
    logger.info('📤 Publisher Agent: Saving article to Railway Database...');

    if (!this.isConfigured()) {
      logger.error('❌ DATABASE_URL is missing in .env');
      return {
        success: false,
        message: 'Database not configured',
      };
    }

    try {
      // 1. Prepare clean Markdown content (no FrontMatter)
      const markdownContent = this.cleanArticleContent(article);
      
      // 2. Load thumbnail data (NOT NEEDED for DB storage, but kept logic clean)
      // We only need the path/filename now.
      
      // 3. Save to Database
      const dbResult = await saveArticle({
        title: frontMatter.title,
        slug: frontMatter.slug,
        category: frontMatter.category,
        excerpt: frontMatter.excerpt || frontMatter.seo?.description,
        content: markdownContent, // Storing clean Markdown
        thumbnailFilename: frontMatter.thumbnail?.filename,
        thumbnailPath: frontMatter.thumbnail?.localPath, // Storing the path
        webflowItemId: null, // Not used anymore
        metadata: frontMatter, // Storing full metadata as JSONB
      });

      logger.success(`✅ Article published to Database (ID: ${dbResult.id})`);
      
      return {
        success: true,
        articleId: dbResult.id,
        slug: dbResult.slug,
        url: dbResult.thumbnailUrl // Returns the generated URL for the thumbnail if any
      };

    } catch (error) {
      logger.error('Failed to publish to Database', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default PublisherAgent;
