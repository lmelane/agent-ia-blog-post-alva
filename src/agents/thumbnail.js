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
    const concepts = this.extractVisualConcepts(articleTitle, articleSummary);
    
    const basePrompt = `Ultra-realistic, professional photograph for a premium tech/business blog article.

ARTICLE TOPIC: ${articleTitle}

CONTEXT: ${articleSummary}

CREATIVE DIRECTION - CREATE A UNIQUE, VARIED VISUAL:
${concepts}

VISUAL DIVERSITY REQUIREMENTS (choose ONE approach that fits the topic):
1. MACRO/CLOSE-UP: Extreme close-up of technology components, circuits, chips, data cables, fiber optics
2. ABSTRACT TECH: Light trails, data visualization, holographic displays, digital interfaces in 3D space
3. WORKSPACE: Modern desk setup with specific tech (laptop, tablet, smartphone, AR glasses, robotics)
4. ARCHITECTURAL: Futuristic building, data center, tech campus, innovation lab, clean room
5. CONCEPTUAL: Metaphorical representation (network nodes, brain synapses, quantum particles, DNA strands)
6. HANDS + TECH: Diverse hands interacting with cutting-edge technology (no faces)
7. NATURE + TECH: Biomimicry, sustainable tech, green energy, organic shapes with digital elements
8. INDUSTRIAL: Manufacturing robots, automated assembly, precision machinery, 3D printers

STYLE VARIATIONS (rotate between):
- Dramatic side lighting with strong shadows
- Soft diffused natural window light
- Neon/LED accent lighting (blue, purple, cyan tones)
- Golden hour warm tones
- High-key bright minimalist
- Low-key moody cinematic
- Vibrant colorful tech aesthetic

COMPOSITION VARIETY:
- Rule of thirds with negative space
- Symmetrical centered composition
- Diagonal dynamic angles
- Overhead flat lay
- Extreme perspective (worm's eye or bird's eye)
- Shallow depth of field with bokeh
- Wide environmental shot

TECHNICAL SPECS:
- 8K photorealistic quality
- Professional camera aesthetic (Canon R5, Sony A7R IV, Hasselblad)
- Perfect exposure, white balance, color grading
- 16:9 horizontal format
- NO text, logos, watermarks, UI elements
- NO recognizable human faces
- Sharp focus on main subject

MOOD: Match the article's tone (innovative, serious, exciting, futuristic, trustworthy)

IMPORTANT: Create a UNIQUE visual that stands out from typical "person at computer" stock photos. Be creative and specific to the article's subject matter.`;
    
    return basePrompt;
  }

  /**
   * Extract visual concepts from title and summary
   */
  extractVisualConcepts(title, summary) {
    const lowerTitle = title.toLowerCase();
    const lowerSummary = summary.toLowerCase();
    
    // Detect specific themes and suggest unique visuals
    if (lowerTitle.includes('financement') || lowerTitle.includes('levée') || lowerTitle.includes('investissement')) {
      return '- Focus on: Financial growth visualization, stock market displays, investment charts, currency symbols, venture capital concept\n- Avoid: Generic office scenes';
    }
    
    if (lowerTitle.includes('partenariat') || lowerTitle.includes('collaboration')) {
      return '- Focus on: Connected networks, handshake metaphor with tech elements, interlocking gears, puzzle pieces, collaborative workspace\n- Avoid: Standard meeting rooms';
    }
    
    if (lowerTitle.includes('régulation') || lowerTitle.includes('loi') || lowerTitle.includes('politique')) {
      return '- Focus on: Legal documents with tech overlay, balance scales, government buildings, policy frameworks, compliance symbols\n- Avoid: Boring paperwork';
    }
    
    if (lowerTitle.includes('api') || lowerTitle.includes('plateforme') || lowerTitle.includes('outil')) {
      return '- Focus on: Code on screens, API endpoints visualization, developer tools, terminal windows, software architecture diagrams\n- Avoid: Empty laptops';
    }
    
    if (lowerTitle.includes('gpt') || lowerTitle.includes('llm') || lowerTitle.includes('modèle')) {
      return '- Focus on: Neural network visualization, AI brain concept, language processing, chatbot interface, transformer architecture\n- Avoid: Generic AI imagery';
    }
    
    if (lowerTitle.includes('automatisation') || lowerTitle.includes('automation')) {
      return '- Focus on: Robotic arms, automated assembly, workflow diagrams, process optimization, industrial automation\n- Avoid: Simple computer screens';
    }
    
    // Default: encourage variety
    return '- Create a UNIQUE visual specific to this topic\n- Think beyond typical office/computer imagery\n- Use metaphors, abstract concepts, or specific technology relevant to the subject';
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
