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
   * Style: Editorial illustration (minimalist, institutional, vectorial)
   */
  buildThumbnailPrompt(articleSummary, articleTitle) {
    // Extract domain, key elements, and visual metaphors
    const { domain, keyElements, palette, visualSummary } = this.extractEditorialConcepts(articleTitle, articleSummary);

    const aspect = config.thumbnail?.editorial_profile?.aspect_ratio || '16:9';

    // STRUCTURE: Editorial illustration (minimalist, institutional, vectorial)
    const basePrompt = `Illustration éditoriale minimaliste pour média économique. 
Sujet : ${domain}. 
Éléments clés : ${keyElements}. 
Contexte : ${visualSummary}. 
Style : illustration vectorielle sobre, institutionnelle, moderne. 
Palette : ${palette}. 
Composition : claire, professionnelle, épurée, SANS TEXTE, SANS CHIFFRES, SANS LETTRES, sans logo de journal. 
Métaphores visuelles : symboles abstraits et graphiques pour représenter le sujet. 
Éléments interdits : no text, no numbers, no letters, no words, no typography, no Christmas tree, no decorative elements. 
Format : ${aspect}.`;

    return basePrompt;
  }

  /**
   * Extract editorial concepts for illustration
   * Returns: { domain, keyElements, palette, visualSummary }
   */
  extractEditorialConcepts(title, summary) {
    const lowerTitle = title.toLowerCase();
    const lowerSummary = (summary || '').toLowerCase();
    const combinedText = `${lowerTitle} ${lowerSummary}`;
    
    // Extract amount if present (e.g., "100M€", "1 milliard")
    const amountMatch = summary.match(/(\d+)\s*(million|milliard|M€|M\$|B€|B\$|%)/gi);
    const amounts = amountMatch ? amountMatch.join(', ') : null;
    
    // Healthcare / Medical / Health (PRIORITY: check before finance)
    if (
      combinedText.includes('santé') || combinedText.includes('sante') || combinedText.includes('health') ||
      combinedText.includes('médical') || combinedText.includes('medical') || combinedText.includes('hopital') ||
      combinedText.includes('hospital') || combinedText.includes('diagnostic') || combinedText.includes('patient') ||
      combinedText.includes('soins') || combinedText.includes('healthcare')
    ) {
      return {
        domain: 'IA dans le secteur de la santé européen',
        keyElements: `symboles médicaux (croix, stéthoscope, ECG), tableaux de bord IA médicaux, visualisation de données de santé, ${amounts ? `investissement (${amounts})` : 'graphiques de diagnostic'}, icônes de télémédecine, hôpitaux européens`,
        palette: 'bleu médical, gris élégant, blanc, avec des touches vertes pour la santé et le bien-être',
        visualSummary: amounts ? `investissement majeur (${amounts}) dans l'IA santé, amélioration des diagnostics et réduction des coûts en Europe` : 'IA révolutionne les diagnostics médicaux, amélioration des soins, innovation santé européenne'
      };
    }
    
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

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ prompt }),
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
      logger.error('Failed to generate thumbnail:', error.message);
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
