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
   * Build thumbnail prompt from article summary and title
   * Style: Les Échos editorial illustration (minimalist, institutional, vectorial)
   */
  buildThumbnailPrompt(articleSummary, articleTitle) {
    // Extract domain, key elements, and visual metaphors
    const { domain, keyElements, palette, visualSummary } = this.extractEditorialConcepts(articleTitle, articleSummary);

    const aspect = config.thumbnail?.editorial_profile?.aspect_ratio || '16:9';

    // STRUCTURE: Les Échos editorial style
    const basePrompt = `Minimalist editorial illustration, *Les Échos* style. Subject: ${domain}. Key elements: ${keyElements}. Article title: "${articleTitle}". Visual summary: ${visualSummary}. Style: sober institutional vector illustration. Palette: ${palette}. Clear professional composition, suitable for economic daily newspaper. Format: ${aspect}. Shot with Loïc MELANE Signature preset.`;

    return basePrompt;
  }

  /**
   * Extract editorial concepts for Les Échos style illustration
   * Returns: { domain, keyElements, palette, visualSummary }
   */
  extractEditorialConcepts(title, summary) {
    const lowerTitle = title.toLowerCase();
    const lowerSummary = (summary || '').toLowerCase();
    const combinedText = `${lowerTitle} ${lowerSummary}`;
    
    // Extract amount if present (e.g., "100M€", "1 milliard")
    const amountMatch = summary.match(/(\d+)\s*(million|milliard|M€|M\$|B€|B\$|%)/gi);
    const amounts = amountMatch ? amountMatch.join(', ') : null;
    
    // Energy / Green / Climate
    if (
      combinedText.includes('énergie') || combinedText.includes('energie') || combinedText.includes('energy') ||
      combinedText.includes('vert') || combinedText.includes('green') || combinedText.includes('climat') ||
      combinedText.includes('renouvelable') || combinedText.includes('solaire') || combinedText.includes('éolien')
    ) {
      return {
        domain: 'green energy and AI',
        keyElements: `renewable energy symbols (solar panels, wind turbines), AI network flows, France map outline, ${amounts ? `investment figure (${amounts})` : 'growth charts'}, energy grid visualization`,
        palette: 'dark blue, elegant grey, white, with green accents for growth and sustainability',
        visualSummary: amounts ? `major investment (${amounts}) to propel AI in renewable energy, French energy transition` : 'AI-powered energy transition in France, renewable infrastructure'
      };
    }
    
    // Financing / Investment / Funding
    if (
      combinedText.includes('financement') || combinedText.includes('levée') || combinedText.includes('investissement') ||
      combinedText.includes('funding') || combinedText.includes('million') || combinedText.includes('milliard')
    ) {
      return {
        domain: 'fintech AI and algorithmic trading' + (combinedText.includes('trading') || combinedText.includes('algoset') ? ', startup Algoset' : ''),
        keyElements: `dynamic stock market charts, digital data flows, symbolic algorithms, ${amounts ? `funding symbol (${amounts})` : 'investment rounds'}, investors (Sequoia Capital, venture capital)`,
        palette: 'dark blue, elegant grey, white, with green touches for growth',
        visualSummary: amounts ? `major funding round (${amounts}) to propel AI, growth and European expansion` : 'AI-powered fintech growth, algorithmic trading innovation'
      };
    }
    
    // Banking / Finance
    if (combinedText.includes('banque') || combinedText.includes('bank') || combinedText.includes('bancaire') || combinedText.includes('paiement')) {
      return {
        domain: 'AI in European banking sector',
        keyElements: `banking institution symbols, AI-powered dashboards, € currency symbols, productivity charts ${amounts ? `(${amounts})` : ''}, digital transformation icons, French/EU bank logos`,
        palette: 'dark blue, elegant grey, white, with gold accents for premium banking',
        visualSummary: amounts ? `AI revolution in banking, ${amounts} productivity increase, digital transformation` : 'AI adoption in European banks, productivity gains, digital innovation'
      };
    }
    
    // Regulation / Policy
    if (combinedText.includes('régulation') || combinedText.includes('loi') || combinedText.includes('politique') || combinedText.includes('regulation')) {
      return {
        domain: 'AI regulation and policy',
        keyElements: 'legal documents symbols, EU flag, République Française emblem, compliance icons, regulatory framework visualization, institutional architecture',
        palette: 'dark blue, elegant grey, white, with red accents for regulatory importance',
        visualSummary: amounts ? `new AI regulations with ${amounts} compliance requirements, French/EU institutional framework` : 'AI regulatory framework, French and European policy, compliance requirements'
      };
    }
    
    // Partnerships
    if (combinedText.includes('partenariat') || combinedText.includes('collaboration') || combinedText.includes('partner')) {
      return {
        domain: 'strategic AI partnerships',
        keyElements: 'handshake symbol, company logos connection, partnership network, French/EU flags, collaboration icons',
        palette: 'dark blue, elegant grey, white, with orange accents for collaboration',
        visualSummary: 'strategic partnerships between French/European companies, AI collaboration, joint innovation'
      };
    }
    
    // Crypto / Blockchain
    if (combinedText.includes('crypto') || combinedText.includes('blockchain') || combinedText.includes('bitcoin')) {
      return {
        domain: 'cryptocurrency and blockchain AI',
        keyElements: `blockchain network visualization, crypto symbols (₿, Ξ), digital finance icons, ${amounts ? `market figures (${amounts})` : 'trading charts'}, fintech innovation`,
        palette: 'dark blue, elegant grey, white, with gold accents for digital assets',
        visualSummary: amounts ? `crypto market evolution (${amounts}), AI-powered blockchain, digital finance innovation` : 'AI in cryptocurrency, blockchain technology, digital finance transformation'
      };
    }
    
    // Security / Fraud
    if (combinedText.includes('fraude') || combinedText.includes('sécurité') || combinedText.includes('cybersécurité')) {
      return {
        domain: 'AI cybersecurity and fraud detection',
        keyElements: `security shield symbols, fraud detection alerts, risk heatmap, AI monitoring dashboard, ${amounts ? `threat reduction (${amounts})` : 'protection icons'}`,
        palette: 'dark blue, elegant grey, white, with red accents for security alerts',
        visualSummary: amounts ? `AI fraud detection with ${amounts} efficiency increase, cybersecurity innovation` : 'AI-powered fraud detection, cybersecurity enhancement, risk management'
      };
    }
    
    // Default: General AI & Business
    return {
      domain: 'artificial intelligence and business innovation',
      keyElements: `AI network symbols, digital transformation icons, French corporate symbols, € currency, ${amounts ? `growth figures (${amounts})` : 'productivity charts'}, innovation metaphors`,
      palette: 'dark blue, elegant grey, white, with blue accents for technology',
      visualSummary: amounts ? `AI business transformation with ${amounts} impact, French/European innovation` : 'AI adoption in French business, digital transformation, innovation leadership'
    };
  }

  /**
   * Extract visual concepts from title and summary (LEGACY - kept for compatibility)
   */
  extractVisualConcepts(title, summary) {
    const lowerTitle = title.toLowerCase();
    const lowerSummary = (summary || '').toLowerCase();
    
    // Extract key entities from title and summary for ultra-precise scene
    const combinedText = `${lowerTitle} ${lowerSummary}`;
    
    // Energy / Green / Climate / Infrastructure (SIGNATURE: visible tech/equipment)
    if (
      combinedText.includes('énergie') || combinedText.includes('energie') || combinedText.includes('energy') ||
      combinedText.includes('vert') || combinedText.includes('green') || combinedText.includes('climat') || combinedText.includes('climate') ||
      combinedText.includes('renouvelable') || combinedText.includes('renewable') || combinedText.includes('solaire') || combinedText.includes('solar') ||
      combinedText.includes('éolien') || combinedText.includes('wind') || combinedText.includes('infrastructure')
    ) {
      // Detect specific sub-theme from summary
      if (combinedText.includes('solaire') || combinedText.includes('solar') || combinedText.includes('panneau')) {
        return 'Engineer in high-vis vest inspecting solar panel array with tablet showing real-time AI analytics, visible French utility branding (EDF, Engie), Tricolore flag on equipment, natural outdoor lighting';
      }
      if (combinedText.includes('éolien') || combinedText.includes('wind') || combinedText.includes('turbine')) {
        return 'Wind turbine technician reviewing predictive maintenance dashboard in control room with visible turbine blades through window, French energy company logo visible, technical equipment with French labels';
      }
      if (combinedText.includes('réseau') || combinedText.includes('grid') || combinedText.includes('électrique')) {
        return 'Energy analyst pointing at large wall screen displaying France energy grid map with AI optimization overlays, control room with French utility branding, technical monitors showing real-time data';
      }
      // Default energy scene
      return 'Engineer in modern French energy facility with visible technical equipment, AI monitoring systems, French utility company branding (EDF, Engie), Tricolore flag or French signage visible';
    }
    
    // Financing / Investment / Funding (extract amounts from summary if present)
    if (combinedText.includes('financement') || combinedText.includes('levée') || combinedText.includes('investissement') || combinedText.includes('funding') || combinedText.includes('million') || combinedText.includes('milliard')) {
      // Extract amount if present (e.g., "100M€", "1 milliard")
      const amountMatch = summary.match(/(\d+)\s*(million|milliard|M€|M\$|B€|B\$)/i);
      const amountText = amountMatch ? `visible ${amountMatch[0]} figure on presentation screen` : 'funding figures on glass wall';
      return `Venture capital team in modern Parisian office (Eiffel Tower or Haussmann architecture visible through window) discussing investment, ${amountText}, € symbols visible, French startup logo on screen, professional handshake or document signing scene`;
    }
    
    if (combinedText.includes('partenariat') || combinedText.includes('collaboration') || combinedText.includes('partner')) {
      return 'Two executives shaking hands in French corporate HQ (French flag or EU flag visible in background), partnership agreement document visible, company logos on presentation screen, modern French office setting';
    }
    
    if (combinedText.includes('régulation') || combinedText.includes('loi') || combinedText.includes('politique') || combinedText.includes('regulation') || combinedText.includes('réglementation')) {
      return 'French regulator or compliance officer reviewing documents with visible "République Française" letterhead or EU flag, legal code books on desk, French institutional setting, official reviewing AI compliance paperwork';
    }
    
    if (combinedText.includes('api') || combinedText.includes('plateforme') || combinedText.includes('outil') || combinedText.includes('platform')) {
      return 'Engineer presenting API dashboard on laptop in French tech company, visible .fr domain on screen, modern workspace with French tech branding, developer reviewing code or architecture diagram';
    }
    
    if (combinedText.includes('gpt') || combinedText.includes('llm') || combinedText.includes('modèle') || combinedText.includes('model') || combinedText.includes('openai') || combinedText.includes('intelligence artificielle')) {
      return 'Data scientist or AI researcher in French tech company explaining model outputs to colleague, visible AI dashboard or ChatGPT interface on screen, French tech office setting, professional discussing AI technology';
    }
    
    if (combinedText.includes('automatisation') || combinedText.includes('automation') || combinedText.includes('robotique')) {
      return 'Operator supervising automated system in French factory or warehouse, visible French industrial branding, worker controlling robotic equipment panel, manufacturing or logistics setting with French signage';
    }
    
    if (combinedText.includes('trading') || combinedText.includes('bourse') || combinedText.includes('stock') || combinedText.includes('marché') || combinedText.includes('investissement')) {
      return 'Traders or portfolio managers in French financial institution monitoring multiple screens with market data, visible € currency symbols, French bank or trading floor setting, professional analyzing financial charts';
    }
    
    if (combinedText.includes('crypto') || combinedText.includes('blockchain') || combinedText.includes('bitcoin') || combinedText.includes('ethereum')) {
      return 'Professional in French fintech office reviewing cryptocurrency dashboard on screen, visible crypto charts or blockchain interface, modern workspace with French tech branding, digital finance setting';
    }

    // Fraud / Security / Compliance (KYC/AML)
    if (
      combinedText.includes('fraude') || combinedText.includes('sécurité') || combinedText.includes('securite') ||
      combinedText.includes('aml') || combinedText.includes('kyc') || combinedText.includes('compliance') ||
      combinedText.includes('conformité') || combinedText.includes('cybersécurité')
    ) {
      return 'Compliance analyst or security officer in French bank reviewing fraud detection dashboard, visible risk heatmap or security alerts on screen, professional verifying documents or ID, French banking institution setting';
    }
    
    // Banking / Finance (detect from summary context)
    if (combinedText.includes('banque') || combinedText.includes('bank') || combinedText.includes('bancaire') || combinedText.includes('paiement')) {
      return 'Bank employee or financial professional in French banking institution using AI-powered dashboard, visible French bank branding (BNP Paribas, Société Générale, Crédit Agricole), € symbols on screens, modern banking office setting';
    }
    
    // Default: REAL-LIFE business context with FRENCH/EU signature
    return 'Business professionals in modern French office (Parisian skyline or Haussmann architecture visible), interacting with technology, French corporate branding visible, Les Échos or Le Monde newspaper on desk, € symbols or .fr domains on screens, AZERTY keyboard visible';
  }

  /**
   * Build simplified fallback prompt (Les Échos style, minimal constraints)
   */
  buildSimplifiedPrompt(articleSummary, articleTitle) {
    const { domain, keyElements, palette } = this.extractEditorialConcepts(articleTitle, articleSummary);
    const aspect = config.thumbnail?.editorial_profile?.aspect_ratio || '16:9';
    
    return `Minimalist editorial illustration, Les Échos style. Subject: ${domain}. Elements: ${keyElements}. Palette: ${palette}. Sober institutional vector style. Format: ${aspect}.`;
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

    const fullPrompt = this.buildThumbnailPrompt(articleSummary, articleTitle);
    const simplifiedPrompt = this.buildSimplifiedPrompt(articleSummary, articleTitle);
    
    logger.info('Thumbnail prompt (full):', { prompt: fullPrompt.substring(0, 150) + '...' });

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Strategy: full prompt first, then simplified if fails, then minimal
      const promptToUse = attempt === 1 ? fullPrompt : (attempt === 2 ? simplifiedPrompt : fullPrompt);
      
      // First try with aspect_ratio; if 400 unrecognized param, fallback to minimal payload
      const payloads = [
        { prompt: promptToUse, aspect_ratio: (config.thumbnail?.editorial_profile?.aspect_ratio || '16:9') },
        { prompt: promptToUse },
      ];
      
      if (attempt > 1) {
        logger.info(`Attempt ${attempt}: using ${attempt === 2 ? 'simplified' : 'full'} prompt`);
      }

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
            
            // Content violation: try simplified prompt on next attempt
            if (response.status === 400 && errorText.includes('content')) {
              logger.warn(`Content violation detected. Will retry with simplified prompt. Details: ${errorText}`);
              break; // Go to next attempt with simplified prompt
            }
            
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
            logger.warn('Content policy violation detected. Retrying with simplified prompt.');
            break; // Go to next attempt with simplified prompt
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
