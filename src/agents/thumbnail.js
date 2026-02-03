import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import config from '../config.js';
import { geminiComplete } from '../utils/gemini-client.js';
import { uploadBase64Image, isCloudinaryConfigured } from '../utils/cloudinary-client.js';

/**
 * Thumbnail Agent - Generates article thumbnail images using Reve.com
 */
export class ThumbnailAgent {
  constructor() {
    this.apiKey = process.env.REVE_API_KEY;
    this.apiUrl = 'https://api.reve.com/v1/image/create';
    // Use an environment variable for storage path or default to local public/images
    this.storagePath = process.env.IMAGES_STORAGE_PATH || path.join(process.cwd(), 'public', 'images');
  }

  /**
   * Check if Reve API is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Build dynamic thumbnail prompt using Gemini
   * Creates a scene description tailored to the specific article topic
   */
  async buildDynamicPrompt(articleSummary, articleTitle) {
    logger.info('🎨 Asking Gemini to imagine a visual concept...');
    
    const prompt = `Tu es un Directeur Artistique expert pour un média Tech & Startup (style "Wired", "The Verge", "Beauchoix").
Ta mission : Créer un prompt pour une IA génératrice d'images (comme Midjourney/DALL-E) pour illustrer un article.

TITRE ARTICLE : "${articleTitle}"
RÉSUMÉ : "${articleSummary}"

CONSIGNES VISUELLES :
- PAS DE TEXTE, PAS DE MOTS, PAS DE CHIFFRES sur l'image. JAMAIS.
- Style : Moderne, Premium, "Editorial Illustration" ou "Cinematic Photography" selon le sujet.
- Évite l'isométrie générique "tech corporate" vue mille fois.
- Si le sujet parle d'humain/management -> Mets des visages, des émotions, des scènes de vie.
- Si le sujet est un outil/software -> Mets une représentation abstraite et magnifique de l'interface ou du flux de données (PAS de fausses captures d'écran illisibles).
- Si le sujet est abstrait (concepts) -> Utilise des métaphores visuelles fortes.

FORMAT DE SORTIE (Texte brut en ANGLAIS uniquement) :
[Description de la scène principale], [Style artistique], [Ambiance/Éclairage], [Couleurs], no text, no typography, high quality, 8k.

Exemple de sortie :
"A close-up cinematic shot of a diverse team of young startup founders brainstorming around a glass table in a sunlit modern loft, expressions of excitement and focus, depth of field, warm lighting, teal and orange color grading, highly detailed, photorealistic, no text."

Génère UNIQUEMENT le prompt en anglais :`;

    try {
      const result = await geminiComplete(prompt, {
        temperature: 0.7,
        maxTokens: 200,
      });
      
      const generatedPrompt = result.content.trim();
      logger.info(`✨ Dynamic Prompt generated: "${generatedPrompt}"`);
      return generatedPrompt;
    } catch (error) {
      logger.warn(`⚠️ Gemini Dynamic Prompt failed (${error.message}). Switching to Static Fallback.`);
      // Fallback to static logic if Gemini fails
      const staticPrompt = this.buildStaticPrompt(articleSummary, articleTitle);
      logger.info(`🛡️ Static Prompt used: "${staticPrompt}"`);
      return staticPrompt;
    }
  }

  /**
   * Build static thumbnail prompt (Fallback)
   */
  buildStaticPrompt(articleSummary, articleTitle) {
    // Extract domain, key elements, and visual metaphors
    const { domain, keyElements, palette, visualSummary } = this.extractEditorialConcepts(articleTitle, articleSummary);
    const aspect = config.thumbnail?.editorial_profile?.aspect_ratio || '16:9';

    return `Editorial illustration for tech media. 
Subject: ${domain}. 
Elements: ${keyElements}. 
Context: ${visualSummary}. 
Style: modern vector illustration, premium, minimalistic. 
Palette: ${palette}. 
Composition: clean, professional, NO TEXT, NO LETTERS. 
Format: ${aspect}.`;
  }

  /**
   * Extract editorial concepts for illustration (Helper for fallback)
   */
  extractEditorialConcepts(title, summary) {
    // ... (Garder la logique existante comme fallback si besoin, ou simplifier)
    // Pour l'instant, je garde une version simplifiée pour le fallback
    return {
      domain: 'Technology and Business',
      keyElements: 'Abstract shapes, digital flows',
      palette: 'Blue, Dark Grey, White',
      visualSummary: 'Tech innovation'
    };
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

    // Use Gemini to generate the prompt
    const prompt = await this.buildDynamicPrompt(articleSummary, articleTitle);
    
    try {
      const aspectRatio = config.thumbnail?.editorial_profile?.aspect_ratio || '16:9';
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
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

      if (data.content_violation) {
        throw new Error('Content policy violation detected by Reve.com');
      }

      if (!data.image) {
        throw new Error('No image data in Reve API response');
      }

      logger.success('Thumbnail generated successfully');
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${timestamp}-${articleSlug}.png`;
      
      // Try Cloudinary first, fallback to local storage
      let imageUrl = null;
      let localPath = null;
      
      if (isCloudinaryConfigured()) {
        logger.info('☁️ Uploading to Cloudinary...');
        try {
          const cloudinaryResult = await uploadBase64Image(
            data.image,
            `${timestamp}-${articleSlug}`,
            'blog-thumbnails'
          );
          imageUrl = cloudinaryResult.url;
          logger.success(`☁️ Cloudinary URL: ${imageUrl}`);
        } catch (cloudError) {
          logger.warn('Cloudinary upload failed, falling back to local storage:', cloudError.message);
        }
      }
      
      // Fallback: save locally if Cloudinary not configured or failed
      if (!imageUrl) {
        await this.saveBase64ImageLocally(data.image, filename);
        localPath = path.join(this.storagePath, filename);
        // Use BASE_URL for local images
        const baseUrl = (config.baseUrl || '').replace(/\/$/, '');
        imageUrl = `${baseUrl}/images/${filename}`;
      }

      return {
        success: true,
        thumbnail: {
          filename: filename,
          url: imageUrl, // Direct URL (Cloudinary or local)
          localPath: localPath,
          prompt: prompt,
          generatedAt: new Date().toISOString(),
          provider: isCloudinaryConfigured() ? 'cloudinary' : 'local',
        }
      };
    } catch (error) {
      logger.error('Failed to generate thumbnail:', error.message);
      return null;
    }
  }

  /**
   * Save base64 image to local file (fallback)
   */
  async saveBase64ImageLocally(base64Data, filename) {
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storagePath, { recursive: true });

      const filePath = path.join(this.storagePath, filename);

      // Remove data:image/png;base64, prefix if present
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');

      // Convert base64 to buffer and save
      const buffer = Buffer.from(base64Image, 'base64');
      await fs.writeFile(filePath, buffer);

      logger.success(`Thumbnail saved to disk: ${filePath}`);

      return filename;
    } catch (error) {
      logger.error('Failed to save base64 image locally', error);
      throw error;
    }
  }

  /**
   * Run the thumbnail agent
   */
  async run(article, frontMatter) {
    // Wrapper method used by pipeline
    const articleSummary = frontMatter.excerpt || frontMatter.seo?.description || 'Article tech';
    const articleTitle = frontMatter.title;
    const articleSlug = frontMatter.slug;

    return await this.generateThumbnail(articleSummary, articleTitle, articleSlug);
  }
}

export default ThumbnailAgent;
