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
    // No model override: the API quickstart shows only a prompt payload
  }

  /**
   * Check if Reve API is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Build thumbnail prompt from article summary (real-life editorial/documentary style)
   */
  buildThumbnailPrompt(articleSummary, articleTitle) {
    // Extract key concepts for REAL scenes
    const visualDirection = this.extractVisualConcepts(articleTitle, articleSummary);

    const prof = config.thumbnail?.editorial_profile || {};
    const filmStock = prof.film_stock || 'Portra 400';
    const timeOfDay = prof.time_of_day || 'daylight';
    const locationBias = prof.location_bias || 'office';
    const facesPolicy = prof.faces || 'allow';
    const aspect = prof.aspect_ratio || '16:9';

    const basePrompt = `Documentary editorial photograph, ultra realistic, 8K quality, natural lighting (${timeOfDay}), realistic colors, ${aspect}.

TITLE CONTEXT: ${articleTitle}

SUBJECT & SCENE: ${visualDirection}

STYLE: authentic photojournalism, candid human expressions, raw realism, unscripted moment, tactile textures, natural imperfections. Avoid CGI, illustration, or cinematic over-stylization.

CREATIVE DIRECTION: capture a decisive moment in context; environmental storytelling; imperfect framing like real reportage; elements in motion; depth and emotion. Include subtle flaws (slight blur in background, film grain, real shadows).

CAMERA: 35mm lens, f/2.8, ISO 400, shutter 1/250; handheld camera feeling; natural light (window, daylight, lamps). Color grading: subtle documentary tone, neutral contrast, soft film grain (${filmStock} look).

FRAMING: rule of thirds with natural variation; dynamic but not staged; focus on realism. FULL SINGLE FRAME ONLY — no collage, no split-screen, no diptych, no multiple panels, no grid. One cohesive photograph.

LOCATION BIAS: ${locationBias}. Faces: ${facesPolicy}.`;

    return basePrompt;
  }

  /**
   * Extract visual concepts from title and summary
   */
  extractVisualConcepts(title, summary) {
    const lowerTitle = title.toLowerCase();
    const lowerSummary = summary.toLowerCase();
    
    // Suggest REAL-LIFE visuals with people and environments
    if (lowerTitle.includes('financement') || lowerTitle.includes('levée') || lowerTitle.includes('investissement') || lowerTitle.includes('funding')) {
      return 'VISUAL: Venture capital team in modern office discussing a term sheet on a table with printed documents and highlighters; close-up of hands signing an investment agreement; CFO presenting funding figures on a glass wall; founders shaking hands in a real meeting room.';
    }
    
    if (lowerTitle.includes('partenariat') || lowerTitle.includes('collaboration') || lowerTitle.includes('partner')) {
      return 'VISUAL: Two executives shaking hands in a conference room, authentic business attire; joint workshop with teams around a whiteboard; people signing a partnership document; mixed team collaboration scene with post-its and laptops.';
    }
    
    if (lowerTitle.includes('régulation') || lowerTitle.includes('loi') || lowerTitle.includes('politique') || lowerTitle.includes('regulation')) {
      return 'VISUAL: Regulator or compliance officer reviewing documents in an office; close-up of a gavel on a real desk with legal files; corporate compliance team meeting; courthouse hallway with people in motion.';
    }
    
    if (lowerTitle.includes('api') || lowerTitle.includes('plateforme') || lowerTitle.includes('outil') || lowerTitle.includes('platform')) {
      return 'VISUAL: Engineer presenting an API dashboard on a laptop in a meeting; developer pair-programming in a modern workspace; product manager pointing at an architecture diagram on a whiteboard; server room corridor with real hardware and a technician walking by.';
    }
    
    if (lowerTitle.includes('gpt') || lowerTitle.includes('llm') || lowerTitle.includes('modèle') || lowerTitle.includes('model') || lowerTitle.includes('openai')) {
      return 'VISUAL: Data scientist explaining model outputs to a colleague on paper printouts; UX researcher observing a user interacting with an AI assistant on a smartphone; team reviewing prompt examples around a real table; call center agent using an AI tool with headset.';
    }
    
    if (lowerTitle.includes('automatisation') || lowerTitle.includes('automation')) {
      return 'VISUAL: Operator supervising an automated conveyor belt in a real factory; close-up of worker hands controlling a robotic arm panel; warehouse associate scanning packages with handheld device; manufacturing line with staff in PPE.';
    }
    
    if (lowerTitle.includes('trading') || lowerTitle.includes('bourse') || lowerTitle.includes('stock')) {
      return 'VISUAL: Traders in a real trading floor monitoring multiple screens; close-up of a hand placing an order on a mechanical keyboard; portfolio manager discussing charts with a colleague; finance team debrief around a real-world dashboard printout.';
    }
    
    if (lowerTitle.includes('crypto') || lowerTitle.includes('blockchain') || lowerTitle.includes('bitcoin')) {
      return 'VISUAL: Person scanning a QR code to pay with crypto at a café; hardware wallet on a real desk next to a laptop; meetup group discussing blockchain in a co-working space; crypto ATM with a user interacting.';
    }

    // Fraud / Security / Compliance (KYC/AML)
    if (
      lowerTitle.includes('fraude') || lowerTitle.includes('sécurité') || lowerTitle.includes('securite') ||
      lowerTitle.includes('aml') || lowerTitle.includes('kyc') || lowerTitle.includes('compliance') ||
      lowerSummary.includes('fraude') || lowerSummary.includes('sécurité') || lowerSummary.includes('securite') ||
      lowerSummary.includes('aml') || lowerSummary.includes('kyc') || lowerSummary.includes('conformité') || lowerSummary.includes('compliance')
    ) {
      return 'VISUAL: Compliance analyst reviewing suspicious transactions on printed reports with a highlighter; bank agent verifying a customer ID and documents at a service desk; team discussion around a risk heatmap on a whiteboard; close-up of hands comparing ID card and paperwork with a security watermark visible.';
    }
    
    // Default: REAL-LIFE business context
    return 'VISUAL: Professionals in a real office or retail environment interacting with financial technology; candid human expressions; authentic workspace details (documents, pens, coffee mugs), natural light, no CGI.';
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

    const prompt = this.buildThumbnailPrompt(articleSummary, articleTitle);
    logger.info('Thumbnail prompt:', { prompt: prompt.substring(0, 150) + '...' });

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // First try with aspect_ratio; if 400 unrecognized param, fallback to minimal payload
      const payloads = [
        { prompt: prompt, aspect_ratio: (config.thumbnail?.editorial_profile?.aspect_ratio || '16:9') },
        { prompt: prompt },
      ];

      for (let variant = 0; variant < payloads.length; variant++) {
        const payload = payloads[variant];
        try {
          const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            // If bad request and we used extended payload, try minimal immediately
            if (response.status === 400 && variant === 0) {
              logger.warn(`Reve payload with aspect_ratio rejected (400). Falling back to minimal payload. Details: ${errorText}`);
              continue;
            }
            throw new Error(`Reve API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();

          logger.info('Reve API response:', {
            request_id: data.request_id,
            credits_used: data.credits_used,
            credits_remaining: data.credits_remaining,
          });

          if (data.content_violation) {
            throw new Error('Content policy violation detected by Reve.com');
          }

          if (!data.image) {
            throw new Error('No image data in Reve API response');
          }

          logger.success('Thumbnail generated successfully');
          logger.info(`Credits used: ${data.credits_used}, remaining: ${data.credits_remaining}`);

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
          logger.warn(`Reve generation attempt ${attempt}/${maxAttempts} variant ${variant + 1} failed: ${error.message}`);
          // If variant 0 failed with 400, loop continues to variant 1; otherwise go to retry/backoff
          if (!(variant === 0 && /400/.test(error.message))) {
            // Only backoff between outer attempts
            break;
          }
        }
      }

      if (attempt < maxAttempts) {
        const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
        await new Promise(res => setTimeout(res, delayMs));
        continue;
      }

      logger.error('Failed to generate thumbnail after retries');
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
