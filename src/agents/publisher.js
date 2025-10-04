import fetch from 'node-fetch';
import fs from 'fs/promises';
import logger from '../utils/logger.js';
import { saveArticle } from '../utils/database.js';

/**
 * Publisher Agent - Publishes articles to Webflow CMS
 */
export class PublisherAgent {
  constructor() {
    this.apiKey = process.env.WEBFLOW_API_KEY;
    this.collectionId = process.env.WEBFLOW_COLLECTION_ID;
    this.categoryCollectionId = '68df723aae69cd82d2618bbb'; // Collection Categories
    this.siteId = '68de80f5980db27710f202f7'; // Site ID (alva)
    this.apiUrl = 'https://api.webflow.com/v2';
    
    // Mapping des catégories (nom → ID Webflow)
    this.categoryMapping = {
      'Innovation & Produits': '68df72406f6e13be0b12cd0c',
      'Finance & Investissement': '68dfa4a039b6559ddc60f6f5',
      'Outils & Technologies': '68dfa4c3f7330aa38fc3cfd1',
      'Marketing & Ventes': '68dfa4cca714486e92f625bf',
      'Analyse & Tendances': '68dfa4d655f3d01e9f8b7f2e',
      'Régulation & Éthique': '68dfa4df3da71d54578639ff',
      'Business & Stratégie': '68dfa4e66f410867fa0289a9',
      'Partenariats & Écosystème': '68dfa4ee2c3f724cfa8cc2b3',
    };
  }

  /**
   * Fetch categories from Webflow and build a name -> id map
   */
  async fetchCategoriesMap() {
    try {
      const url = `${this.apiUrl}/collections/${this.categoryCollectionId}/items?limit=100`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        logger.warn(`Failed to fetch Webflow categories: ${response.status}`);
        return {};
      }

      const data = await response.json();
      const items = data.items || [];
      const map = {};
      for (const it of items) {
        // Prefer fieldData.name as the human name
        const name = it.fieldData?.name || it.name || it.fieldData?.title;
        if (name) map[name.trim()] = it.id;
      }
      logger.info(`Loaded ${Object.keys(map).length} Webflow categories`);
      return map;
    } catch (err) {
      logger.warn('Could not fetch Webflow categories', err);
      return {};
    }
  }

  /**
   * Check if Webflow CMS is configured
   */
  isConfigured() {
    return !!(this.apiKey && this.collectionId);
  }

  /**
   * Get category ID from category name
   */
  getCategoryId(categoryName) {
    // Mapping Finance x IA → Catégories Webflow existantes
    const categoryMap = {
      // Nouvelles catégories Finance x IA
      'Trading & Investissement': 'Finance & Investissement',
      'Banque & Paiements': 'Finance & Investissement',
      'Assurance & Risques': 'Finance & Investissement',
      'Détection Fraude & Sécurité': 'Outils & Technologies',
      'Fintech & Innovation': 'Innovation & Produits',
      'Régulation & Compliance': 'Régulation & Éthique',
      'Analyse & Prévisions': 'Analyse & Tendances',
      'Crypto & DeFi': 'Finance & Investissement',
      
      // Anciennes catégories (rétrocompatibilité)
      'Lancements Produits': 'Innovation & Produits',
      'Financements & Deals': 'Finance & Investissement',
      'Outils & Plateformes': 'Outils & Technologies',
      'Marketing & Ventes': 'Marketing & Ventes',
      'Stratégie & Tendances': 'Analyse & Tendances',
      'Régulations & Politique': 'Régulation & Éthique',
      'Cas d\'Usage': 'Business & Stratégie',
      'Partenariats': 'Partenariats & Écosystème',
      'Technologie': 'Outils & Technologies',
      'Entreprise': 'Business & Stratégie',
      'Économie': 'Finance & Investissement',
    };
    
    // Convertir la catégorie Finance x IA en catégorie Webflow
    const mappedCategory = categoryMap[categoryName] || categoryName;
    
    // Retourner l'ID Webflow
    const categoryId = this.categoryMapping[mappedCategory];
    
    if (!categoryId) {
      logger.warn(`No Webflow ID found for category: ${categoryName} → ${mappedCategory}`);
    }
    
    return categoryId || null;
  }

  /**
   * Upload image to Webflow Assets
   */
  async uploadImage(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Webflow accepts base64 images in fieldData
      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      logger.warn('Could not upload image', error);
      return null;
    }
  }

  /**
   * Convert Markdown to HTML for Webflow Rich Text
   */
  markdownToHTML(markdown) {
    let html = markdown;
    
    // Links FIRST (before other conversions to avoid conflicts)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic  
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Lists (numbered) - convert each line
    const lines = html.split('\n');
    let inList = false;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^(\d+)\.\s+(.+)$/);
      
      if (listMatch) {
        if (!inList) {
          result.push('<ol>');
          inList = true;
        }
        result.push(`<li>${listMatch[2]}</li>`);
      } else {
        if (inList) {
          result.push('</ol>');
          inList = false;
        }
        result.push(line);
      }
    }
    
    if (inList) {
      result.push('</ol>');
    }
    
    html = result.join('\n');
    
    // Paragraphs (text not in tags)
    html = html.split('\n\n').map(para => {
      const trimmed = para.trim();
      if (trimmed && !trimmed.match(/^<(h2|h3|ol|ul|li)/)) {
        return `<p>${trimmed}</p>`;
      }
      return trimmed;
    }).join('\n\n');
    
    return html;
  }

  /**
   * Clean article content for Webflow Rich Editor
   * Remove front-matter, title H1, category and convert to HTML
   */
  cleanArticleForWebflow(article) {
    // Remove YAML front-matter
    let cleaned = article.replace(/^---[\s\S]*?---\n/m, '');
    
    // Remove title H1
    cleaned = cleaned.replace(/^#\s+.+\n\n/m, '');
    
    // Remove category line (robust to extra spaces and single/double newline)
    cleaned = cleaned.replace(/^\s*\*\*Catégorie:\*\*.*\n?/mi, '');
    
    // Remove placeholder "## Sources" section (will be added properly later)
    cleaned = cleaned.replace(/##\s+Sources\s*\n+Les sources seront ajoutées automatiquement\./gm, '');
    
    // Convert Markdown to HTML
    const html = this.markdownToHTML(cleaned.trim());
    
    return html;
  }

  /**
   * Add sources to article content (HTML)
   * The input article string is already HTML (see cleanArticleForWebflow)
   */
  addSourcesToArticle(articleHtml, sources) {
    if (!sources || sources.length === 0) return articleHtml;

    let html = articleHtml;
    
    // Remove existing Sources section from Writer (text format)
    // Pattern: ## Sources\n[1] Title: URL (date)\n[2] Title: URL (date)...
    html = html.replace(/<h2>Sources<\/h2>[\s\S]*?(?=<h2>|$)/i, '');
    
    // Add clean HTML sources list
    html += '\n\n<h2>Sources</h2>\n<ol>';
    sources.forEach((source) => {
      const title = source.titre || source.title || 'Source';
      const url = source.url || '#';
      const date = source.date_fr ? ` (${source.date_fr})` : '';
      html += `\n  <li><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>${date}</li>`;
    });
    html += '\n</ol>';

    return html;
  }

  /**
   * Publish article to Webflow CMS
   */
  async publishToWebflow(article, frontMatter) {
    logger.info('📤 Publishing to Webflow CMS...');

    try {
      // Clean article for Webflow (remove front-matter, title, category) and convert to HTML
      const cleanedArticleHtml = this.cleanArticleForWebflow(article);
      
      // Add sources (HTML list) to article HTML content
      const articleWithSources = this.addSourcesToArticle(cleanedArticleHtml, frontMatter.sources);
      
      // Enforce resume (excerpt) length <= 3000 characters with graceful truncation
      const MAX_RESUME = 3000;
      const rawExcerpt = frontMatter.excerpt || '';
      const smartTruncate = (text, limit) => {
        if (!text || text.length <= limit) return text || '';
        const slice = text.slice(0, limit);
        // Prefer end of sentence within the slice
        const sentenceEnd = Math.max(
          slice.lastIndexOf('. '),
          slice.lastIndexOf('! '),
          slice.lastIndexOf('? '),
          slice.lastIndexOf('… '),
        );
        if (sentenceEnd > 0 && sentenceEnd >= Math.floor(limit * 0.6)) {
          return slice.slice(0, sentenceEnd + 1).trim();
        }
        // Else cut at last whitespace
        const lastSpace = slice.lastIndexOf(' ');
        if (lastSpace > 0) {
          return (slice.slice(0, lastSpace).trim() + '…');
        }
        // Fallback: hard cut with ellipsis
        return (slice.trim() + '…');
      };

      const safeExcerpt = smartTruncate(rawExcerpt, MAX_RESUME);
      if (safeExcerpt.length < rawExcerpt.length) {
        logger.warn(`Resume exceeded ${MAX_RESUME} chars (was ${rawExcerpt.length}). Truncated gracefully to ${safeExcerpt.length}.`);
      }

      // STEP 1: Save to database first to get public thumbnail URL
      logger.info('💾 Saving article to database...');
      
      const thumbnailData = frontMatter.thumbnail?.localPath 
        ? await fs.readFile(frontMatter.thumbnail.localPath)
        : null;

      const dbResult = await saveArticle({
        title: frontMatter.title,
        slug: frontMatter.slug,
        category: frontMatter.category,
        excerpt: safeExcerpt,
        content: articleWithSources,
        thumbnailData,
        thumbnailFilename: frontMatter.thumbnail?.filename,
        webflowItemId: null, // Will be updated after Webflow creation
        metadata: frontMatter,
      });

      logger.success(`✅ Article saved to database`);
      logger.info(`Thumbnail URL: ${dbResult.thumbnailUrl}`);
      
      // STEP 2: Resolve category ID from Webflow categories collection
      const categoriesMap = await this.fetchCategoriesMap();
      let categoryId = categoriesMap[frontMatter.category];
      if (!categoryId) {
        // Fallback to static mapping (legacy)
        categoryId = this.getCategoryId(frontMatter.category);
      }
      
      if (!categoryId) {
        logger.warn(`Category not found in mapping: ${frontMatter.category}`);
      }
      
      // STEP 3: Prepare field data with public thumbnail URL
      const fieldData = {
        // Champs obligatoires
        name: frontMatter.title,                              // Name (PlainText, Required)
        slug: frontMatter.slug,                               // Slug (PlainText, Required)
        
        // Champs de contenu
        article: articleWithSources,                          // article (RichText) - Contenu avec sources
        resume: safeExcerpt,                                  // resume (PlainText, <=3000 chars)
        
        // Catégorie (Reference vers collection Categories)
        direction: categoryId,                                // direction (Reference) - Lien vers catégorie
        
        // Indicateur (texte de la catégorie pour affichage)
        'indicator-rio': frontMatter.category,                // indicator-rio (PlainText) - Nom catégorie
        
        // Temps de lecture
        'temps-de-lecture': `${frontMatter.reading_time} min`, // temps-de-lecture (PlainText)
        
        // Thumbnail URL publique
        'thumbnail-link': dbResult.thumbnailUrl,              // thumbnail-link (PlainText) - URL publique
        
        // SEO
        'meta-title': frontMatter.seo?.title || frontMatter.title,           // meta-title (PlainText)
        'meta-description': frontMatter.seo?.description || frontMatter.excerpt, // meta-description (PlainText)
        'description-seo': frontMatter.seo?.description || frontMatter.excerpt,  // description-seo (PlainText)
        'meta-keywords': frontMatter.seo?.keywords?.join(', ') || '',        // meta-keywords (PlainText)
        'mots-cles-seo': frontMatter.seo?.keywords?.join(', ') || '',        // mots-cles-seo (PlainText)
      };

      // Create collection item
      const response = await fetch(
        `${this.apiUrl}/collections/${this.collectionId}/items`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify({
            fieldData,
            isDraft: false, // Publish immediately
            isArchived: false,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webflow API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      logger.success('✅ Article published to Webflow CMS');
      logger.info(`Item ID: ${data.id}`);
      logger.info(`Slug: ${data.fieldData.slug}`);

      // Publish site to make article live
      await this.publishSite();

      return {
        success: true,
        itemId: data.id,
        slug: data.fieldData.slug,
        url: `https://yoursite.webflow.io/blog/${data.fieldData.slug}`,
        thumbnailUrl: dbResult.thumbnailUrl,
      };
    } catch (error) {
      logger.error('Failed to publish to Webflow', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update Webflow item with additional fields
   */
  async updateWebflowItem(itemId, fieldData) {
    try {
      const response = await fetch(
        `${this.apiUrl}/collections/${this.collectionId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify({
            fieldData,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`Failed to update Webflow item: ${response.status} - ${errorText}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.warn('Could not update Webflow item', error);
      return false;
    }
  }

  /**
   * Get site domains
   */
  async getSiteDomains() {
    try {
      const response = await fetch(
        `${this.apiUrl}/sites/${this.siteId}/custom_domains`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.warn(`Could not get domains: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.customDomains || [];
    } catch (error) {
      logger.warn('Could not get site domains', error);
      return [];
    }
  }

  /**
   * Publish Webflow site to make changes live
   */
  async publishSite() {
    try {
      logger.info('📤 Publishing Webflow site...');
      
      // Get custom domains and publish specifically to these domain IDs
      const customDomains = await this.getSiteDomains();
      const domainIds = (customDomains || [])
        .map(d => d.id || d._id || d.domainId || d.domain_id)
        .filter(Boolean);

      if (!domainIds.length) {
        logger.warn('No domain IDs found from Webflow. Attempting to publish to all by sending empty body...');
      } else {
        logger.info(`Found ${domainIds.length} domain(s). Publishing to: ${domainIds.join(', ')}`);
      }

      const body = domainIds.length ? { domains: domainIds } : {};

      const response = await fetch(
        `${this.apiUrl}/sites/${this.siteId}/publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`Site publish failed: ${response.status} - ${errorText}`);
        return false;
      }

      logger.success('✅ Site published successfully');
      return true;
    } catch (error) {
      logger.warn('Could not publish site', error);
      return false;
    }
  }

  /**
   * Run the publisher agent
   */
  async run(article, frontMatter) {
    logger.info('📤 Publisher Agent: Publishing article...');

    if (!this.isConfigured()) {
      logger.warn('⚠️  Webflow CMS not configured - skipping publication');
      logger.info('   Add WEBFLOW_API_KEY and WEBFLOW_COLLECTION_ID to .env');
      return {
        success: false,
        message: 'Webflow CMS not configured',
      };
    }

    return await this.publishToWebflow(article, frontMatter);
  }
}

export default PublisherAgent;
