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
   * Check if Webflow CMS is configured
   */
  isConfigured() {
    return !!(this.apiKey && this.collectionId);
  }

  /**
   * Get category ID from category name
   */
  getCategoryId(categoryName) {
    // Mapping des anciennes catégories vers les nouvelles
    const categoryMap = {
      'Lancements Produits': 'Innovation & Produits',
      'Financements & Deals': 'Finance & Investissement',
      'Outils & Plateformes': 'Outils & Technologies',
      'Marketing & Ventes': 'Marketing & Ventes',
      'Stratégie & Tendances': 'Analyse & Tendances',
      'Régulations & Politique': 'Régulation & Éthique',
      'Cas d\'Usage': 'Business & Stratégie',
      'Partenariats': 'Partenariats & Écosystème',
      // Mapping des catégories génériques
      'Technologie': 'Outils & Technologies',
      'Entreprise': 'Business & Stratégie',
      'Économie': 'Finance & Investissement',
      'Santé': 'Business & Stratégie',
      'Culture': 'Business & Stratégie',
      'Carrière': 'Business & Stratégie',
    };
    
    // Convertir l'ancienne catégorie en nouvelle si nécessaire
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
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    
    // Lists (numbered)
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');
    
    // Paragraphs (text not in tags)
    html = html.split('\n\n').map(para => {
      if (!para.match(/^<[h2|h3|ol|ul]/)) {
        return `<p>${para}</p>`;
      }
      return para;
    }).join('\n');
    
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
    
    // Remove category line
    cleaned = cleaned.replace(/^\*\*Catégorie:\*\*\s+.+\n\n/m, '');
    
    // Convert Markdown to HTML
    const html = this.markdownToHTML(cleaned.trim());
    
    return html;
  }

  /**
   * Add sources to article content
   */
  addSourcesToArticle(article, sources) {
    if (!sources || sources.length === 0) return article;
    
    // Add sources section at the end
    let articleWithSources = article + '\n\n## Sources\n\n';
    sources.forEach((source, i) => {
      articleWithSources += `${i + 1}. [${source.titre}](${source.url})`;
      if (source.date_fr) {
        articleWithSources += ` (${source.date_fr})`;
      }
      articleWithSources += '\n';
    });
    
    return articleWithSources;
  }

  /**
   * Publish article to Webflow CMS
   */
  async publishToWebflow(article, frontMatter) {
    logger.info('📤 Publishing to Webflow CMS...');

    try {
      // Clean article for Webflow (remove front-matter, title, category)
      const cleanedArticle = this.cleanArticleForWebflow(article);
      
      // Add sources to article content
      const articleWithSources = this.addSourcesToArticle(cleanedArticle, frontMatter.sources);
      
      // STEP 1: Save to database first to get public thumbnail URL
      logger.info('💾 Saving article to database...');
      
      const thumbnailData = frontMatter.thumbnail?.localPath 
        ? await fs.readFile(frontMatter.thumbnail.localPath)
        : null;

      const dbResult = await saveArticle({
        title: frontMatter.title,
        slug: frontMatter.slug,
        category: frontMatter.category,
        excerpt: frontMatter.excerpt,
        content: articleWithSources,
        thumbnailData,
        thumbnailFilename: frontMatter.thumbnail?.filename,
        webflowItemId: null, // Will be updated after Webflow creation
        metadata: frontMatter,
      });

      logger.success(`✅ Article saved to database`);
      logger.info(`Thumbnail URL: ${dbResult.thumbnailUrl}`);
      
      // STEP 2: Get category ID from category name
      const categoryId = this.getCategoryId(frontMatter.category);
      
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
        resume: frontMatter.excerpt,                          // resume (PlainText) - Résumé
        
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
      
      // Publish without specifying domains (publishes to all)
      const response = await fetch(
        `${this.apiUrl}/sites/${this.siteId}/publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify({}),
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
