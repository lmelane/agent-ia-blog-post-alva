import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * Thumbnail Agent - Generates article thumbnail images using Reve.com
 */
export class ThumbnailAgent {
  constructor() {
    this.apiKey = process.env.REVE_API_KEY;
    this.apiUrl = 'https://api.reve.com/v1/image/create';
    this.outputDir = path.join(process.cwd(), 'articles', 'thumbnails');
  }

  /**
   * Check if Reve API is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Build thumbnail prompt from article summary (realistic photo style)
   */
  buildThumbnailPrompt(articleSummary, articleTitle) {
    const basePrompt = `Professional, high-quality, realistic photograph for a blog article thumbnail about: ${articleSummary}. 
    
The image should be:
- A real-life, photorealistic scene directly related to the article topic
- Professional photography quality with good lighting and composition
- Visually engaging and immediately understandable
- Modern and clean aesthetic
- Suitable for a tech/business blog
- No text, no watermark
- 16:9 aspect ratio
- High resolution

Context: ${articleTitle}

Create a compelling, realistic image that captures the essence of this topic.`;
    
    return basePrompt;
  }

  /**
   * Generate thumbnail image using Reve.com
   */
  async generateThumbnail(articleSummary, articleTitle, articleSlug) {
    if (!this.isConfigured()) {
      logger.warn('Reve API key not configured. Skipping thumbnail generation.');
      return null;
    }

    logger.info('🎨 Generating thumbnail image with Reve.com...');

    try {
      const prompt = this.buildThumbnailPrompt(articleSummary, articleTitle);
      
      logger.info('Thumbnail prompt:', { prompt: prompt.substring(0, 150) + '...' });

      // Call Reve.com API (selon la documentation)
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          aspect_ratio: '16:9',
          version: 'latest',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Reve API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      logger.info('Reve API response:', {
        request_id: data.request_id,
        credits_used: data.credits_used,
        credits_remaining: data.credits_remaining,
      });

      // Vérifier la violation de contenu
      if (data.content_violation) {
        throw new Error('Content policy violation detected by Reve.com');
      }

      // L'image est en base64 dans data.image
      if (!data.image) {
        throw new Error('No image data in Reve API response');
      }

      logger.success('Thumbnail generated successfully');
      logger.info(`Credits used: ${data.credits_used}, remaining: ${data.credits_remaining}`);

      // Sauvegarder l'image base64
      const filename = await this.saveBase64Image(data.image, articleSlug);

      return {
        filename: filename,
        localPath: path.join(this.outputDir, filename),
        prompt: prompt,
        generatedAt: new Date().toISOString(),
        provider: 'reve.com',
        request_id: data.request_id,
        credits_used: data.credits_used,
        credits_remaining: data.credits_remaining,
      };
    } catch (error) {
      logger.error('Failed to generate thumbnail', error);
      return null;
    }
  }

  /**
   * Save base64 image to file
   */
  async saveBase64Image(base64Data, articleSlug) {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${timestamp}-${articleSlug}.png`;
      const filePath = path.join(this.outputDir, filename);

      // Remove data:image/png;base64, prefix if present
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');

      // Convert base64 to buffer and save
      const buffer = Buffer.from(base64Image, 'base64');
      await fs.writeFile(filePath, buffer);

      logger.success(`Thumbnail saved: ${filePath}`);

      return filename;
    } catch (error) {
      logger.error('Failed to save base64 image', error);
      throw error;
    }
  }

  /**
   * Download image from URL and save locally (legacy method, not used with Reve.com)
   */
  async downloadAndSaveImage(imageUrl, articleSlug) {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${timestamp}-${articleSlug}.png`;
      const filePath = path.join(this.outputDir, filename);

      // Download image
      logger.info('Downloading thumbnail image...');
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(buffer));

      logger.success(`Thumbnail saved: ${filePath}`);

      return filename;
    } catch (error) {
      logger.error('Failed to download and save thumbnail', error);
      throw error;
    }
  }

  /**
   * Run the thumbnail agent
   */
  async run(article, frontMatter) {
    logger.info('🎨 Thumbnail Agent: Generating article thumbnail...');

    if (!this.isConfigured()) {
      logger.warn('⚠️  Reve API not configured - skipping thumbnail generation');
      logger.info('   Add REVE_API_KEY to .env to enable thumbnail generation');
      return {
        success: false,
        message: 'Reve API not configured',
      };
    }

    try {
      const articleSummary = frontMatter.excerpt || frontMatter.seo?.description || 'Article about AI';
      const articleTitle = frontMatter.title;
      const articleSlug = frontMatter.slug;

      logger.info(`Generating thumbnail for: ${articleTitle}`);

      const thumbnail = await this.generateThumbnail(articleSummary, articleTitle, articleSlug);

      if (!thumbnail) {
        return {
          success: false,
          message: 'Failed to generate thumbnail',
        };
      }

      return {
        success: true,
        thumbnail,
      };
    } catch (error) {
      logger.error('Thumbnail Agent failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default ThumbnailAgent;
