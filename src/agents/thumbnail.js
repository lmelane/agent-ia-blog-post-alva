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
   * Build thumbnail prompt from article summary (ultra-realistic, highly varied style)
   */
  buildThumbnailPrompt(articleSummary, articleTitle) {
    // Extract key concepts to create varied visuals
    const visualDirection = this.extractVisualConcepts(articleTitle, articleSummary);
    
    const basePrompt = `Professional photograph, 8K quality, cinematic lighting, 16:9 format.

${visualDirection}

STRICT RULES:
- NO computers, NO laptops, NO monitors, NO screens
- NO people at desks, NO office scenes
- NO generic tech stock photos
- Focus on abstract concepts, metaphors, or specific objects
- Creative, unique, artistic interpretation

STYLE: Magazine-quality, sharp focus, professional color grading, modern aesthetic.

Create something visually striking and different.`;
    
    return basePrompt;
  }

  /**
   * Extract visual concepts from title and summary
   */
  extractVisualConcepts(title, summary) {
    const lowerTitle = title.toLowerCase();
    const lowerSummary = summary.toLowerCase();
    
    // Detect specific themes and suggest CREATIVE visuals (NO screens/computers)
    if (lowerTitle.includes('financement') || lowerTitle.includes('levée') || lowerTitle.includes('investissement') || lowerTitle.includes('funding')) {
      return 'VISUAL: Golden coins stacked in growth pattern, money tree with glowing leaves, upward arrow made of currency, venture capital rocket launch, investment growth represented by ascending stairs of gold bars. Creative financial metaphor.';
    }
    
    if (lowerTitle.includes('partenariat') || lowerTitle.includes('collaboration') || lowerTitle.includes('partner')) {
      return 'VISUAL: Two puzzle pieces connecting with light between them, interlocking metal gears in motion, handshake sculpture, bridge connecting two islands, merging rivers, collaborative art installation. Partnership metaphor.';
    }
    
    if (lowerTitle.includes('régulation') || lowerTitle.includes('loi') || lowerTitle.includes('politique') || lowerTitle.includes('regulation')) {
      return 'VISUAL: Balance scales with glowing orbs, gavel on marble surface, legal books with golden edges, justice statue, regulatory framework represented by architectural structure, compliance shield. Legal/regulation concept.';
    }
    
    if (lowerTitle.includes('api') || lowerTitle.includes('plateforme') || lowerTitle.includes('outil') || lowerTitle.includes('platform')) {
      return 'VISUAL: Interconnected nodes with light pathways, circuit board macro shot, fiber optic cables with light flowing, modular building blocks, API gateway represented by futuristic door/portal, data streams. Tech infrastructure.';
    }
    
    if (lowerTitle.includes('gpt') || lowerTitle.includes('llm') || lowerTitle.includes('modèle') || lowerTitle.includes('model') || lowerTitle.includes('openai')) {
      return 'VISUAL: Glowing neural pathways in 3D space, brain made of light particles, language represented by floating letters/symbols, transformer architecture as geometric structure, AI consciousness as abstract light formation. NO screens.';
    }
    
    if (lowerTitle.includes('automatisation') || lowerTitle.includes('automation')) {
      return 'VISUAL: Precision robotic arm in action, automated conveyor belt with products, mechanical gears in perfect sync, industrial automation machinery, 3D printer creating object, assembly line close-up. Industrial automation.';
    }
    
    if (lowerTitle.includes('trading') || lowerTitle.includes('bourse') || lowerTitle.includes('stock')) {
      return 'VISUAL: Bull and bear sculptures, trading floor bell, stock ticker tape, candlestick charts as 3D sculptures, market volatility as wave patterns, financial instruments. Trading concept.';
    }
    
    if (lowerTitle.includes('crypto') || lowerTitle.includes('blockchain') || lowerTitle.includes('bitcoin')) {
      return 'VISUAL: Physical Bitcoin coin with dramatic lighting, blockchain represented by chain links, cryptocurrency mining rig close-up, digital wallet as futuristic safe, crypto nodes network. Crypto/blockchain.';
    }
    
    // Default: VERY creative
    return 'VISUAL: Abstract representation using light, geometry, nature metaphors, or artistic installation. Think outside the box. Create something memorable and unique that represents innovation and technology WITHOUT showing computers or screens.';
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
