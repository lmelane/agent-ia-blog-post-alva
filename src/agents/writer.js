import { complete } from '../utils/openai-client.js';
import logger from '../utils/logger.js';
import fileManager from '../utils/file-manager.js';
import slugify from 'slugify';
import matter from 'gray-matter';

/**
 * Writer Agent - Generates complete Markdown articles
 */
export class WriterAgent {
  constructor() {}

  /**
   * Build prompt for article writing with strict structure
   */
  buildWritingPrompt(topic) {
    return `Tu es un journaliste tech professionnel spécialisé en IA Business. Rédige un article EXCEPTIONNEL, engageant et professionnel en FRANÇAIS.

TOPIC INFORMATION:
Titre: ${topic.titre}
Catégorie: ${topic.categorie}
Résumé: ${topic.resume}
Impact: ${topic.impact}

Sources:
${topic.sources?.map((s, i) => `[${i + 1}] ${s.titre}: ${s.url}`).join('\n') || 'N/A'}

OBJECTIF: Créer un article qui se démarque par sa profondeur, son style journalistique et son engagement.

STRUCTURE STRICTE À SUIVRE:

# [Titre accrocheur et SEO-optimisé]

**Catégorie:** ${topic.categorie}

## Résumé
[Écrire exactement 8 lignes qui résument l'article de manière engageante et informative]

## Introduction
[2-3 paragraphes qui introduisent le sujet, son contexte et pourquoi c'est important maintenant]

## [Section H2 principale 1]
[Contenu détaillé avec sous-sections H3 si nécessaire]

### [Sous-section H3 si nécessaire]
[Contenu]

## [Section H2 principale 2]
[Contenu détaillé]

## [Section H2 principale 3]
[Contenu détaillé]

## [Section H2 principale 4 si nécessaire]
[Contenu détaillé]

## FAQ

### Question 1 pertinente ?
Réponse concise et précise.

### Question 2 pertinente ?
Réponse concise et précise.

### Question 3 pertinente ?
Réponse concise et précise.

## Conclusion

[Résumé des points clés et perspectives d'avenir]

**Call-to-Action:** [Incitation à l'action - ex: "Restez informé des dernières innovations IA en suivant notre newsletter" ou "Découvrez comment cette technologie peut transformer votre entreprise"]

## Sources
[Les sources seront ajoutées automatiquement]

EXIGENCES CRITIQUES POUR UN ARTICLE PROFESSIONNEL:

📝 CONTENU & PROFONDEUR:
1. EXEMPLES CONCRETS: Inclure des cas d'usage précis, des entreprises nommées, des chiffres concrets
2. CITATIONS D'EXPERTS: Intégrer des citations de dirigeants, analystes ou chercheurs (si disponibles dans les sources)
3. CONTEXTE HISTORIQUE: Situer l'actualité dans son contexte (évolution, précédents, timeline)
4. NUANCES & LIMITES: Mentionner les défis, limites techniques, controverses potentielles
5. DONNÉES CHIFFRÉES: Statistiques, montants, pourcentages, prévisions de marché
6. COMPARAISONS: Comparer avec des solutions existantes ou concurrents

✍️ STYLE & NARRATION:
7. ACCROCHE PERCUTANTE: Commencer l'introduction avec une statistique choc, une citation ou un fait marquant
8. STORYTELLING: Raconter une histoire, créer une narration engageante (pas un communiqué de presse)
9. MÉTAPHORES: Utiliser des analogies pour vulgariser les concepts techniques
10. TITRES IMPACTANTS: Sections H2 avec formulations engageantes (SANS emojis ni icônes)
11. ÉVITER RÉPÉTITIONS: Varier le vocabulaire, ne pas répéter les mêmes idées
12. TON JOURNALISTIQUE: Professionnel mais vivant, factuel mais engageant

🎯 STRUCTURE & SEO:
13. RÉDIGER ENTIÈREMENT EN FRANÇAIS
14. 1200-1500 mots (article substantiel)
15. Résumé de 8 lignes PERCUTANT
16. Sous-titres H3 optimisés SEO avec mots-clés secondaires
17. FAQ avec questions SPÉCIFIQUES et détaillées (pas génériques)
18. Mots-clés naturels: ${topic.keywords?.join(', ') || 'IA, intelligence artificielle, business'}
19. Citations sources avec [1], [2] dans le texte

📊 ÉLÉMENTS VISUELS (à suggérer):
20. Suggérer des encadrés "💡 Le saviez-vous ?" avec chiffres-clés
21. Proposer des comparaisons "Avant/Après" ou "Traditionnel vs IA"
22. Timeline si pertinent

🚀 ENGAGEMENT:
23. CTA ACTIONNABLE: Pas juste "abonnez-vous" mais proposition de valeur concrète
24. CONCLUSION PROSPECTIVE: "Et demain ?" - vision 5-10 ans, impacts futurs
25. OUVERTURE: Mentionner acteurs concurrents, tendances du secteur

⚠️ IMPORTANT:
- Ne PAS inclure de YAML front-matter
- Commencer directement avec le titre H1
- Citer TOUTES les sources utilisées
- Être factuel mais captivant
- Apporter de la VALEUR au lecteur (insights, analyses, perspectives)

Rédige maintenant un article EXCEPTIONNEL en français qui respecte TOUS ces critères:`;
  }

  /**
   * Extract title from article
   */
  extractTitle(article) {
    const match = article.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Untitled';
  }

  /**
   * Extract summary from article (8 lines after ## Résumé)
   */
  extractSummary(article) {
    const match = article.match(/##\s+Résumé\s*\n([\s\S]+?)(?=\n##)/i);
    if (match) {
      return match[1].trim().substring(0, 500);
    }
    return '';
  }

  /**
   * Calculate reading time
   */
  calculateReadingTime(article) {
    const wordCount = article.split(/\s+/).length;
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Generate YAML front-matter (simplifié - uniquement champs Webflow)
   */
  generateFrontMatter(topic, article) {
    const title = this.extractTitle(article);
    const summary = this.extractSummary(article);
    const slug = slugify(title, {
      lower: true,
      strict: true,
    });

    return {
      title,
      slug,
      category: topic.categorie,
      excerpt: summary || topic.resume?.substring(0, 155),
      reading_time: this.calculateReadingTime(article),
      seo: {
        title,
        description: summary || topic.resume?.substring(0, 155),
        keywords: topic.keywords || [],
      },
      sources: topic.sources?.map(s => ({
        titre: s.titre,
        url: s.url,
        date: s.date,
        date_fr: s.date ? new Date(s.date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) : null,
      })) || [],
    };
  }

  /**
   * Add references section to article (replace ## Sources placeholder)
   */
  addReferences(article, sources) {
    if (!sources || sources.length === 0) return article;

    let referencesSection = '## Sources\n\n';
    
    sources.forEach((source, index) => {
      const sourceTitle = source.titre || source.title || 'Source';
      const sourceDate = source.date ? ` (${source.date})` : '';
      referencesSection += `${index + 1}. [${sourceTitle}](${source.url})${sourceDate}\n`;
    });

    // Replace the ## Sources placeholder or append
    if (article.includes('## Sources')) {
      return article.replace(/## Sources\s*\n\[Les sources seront ajoutées automatiquement\]/, referencesSection);
    } else {
      return article + '\n\n' + referencesSection;
    }
  }

  /**
   * Validate article quality with new requirements
   */
  validateArticle(article) {
    const issues = [];
    const wordCount = article.split(/\s+/).length;

    // Check word count (1000-1500)
    if (wordCount < 1000) {
      issues.push(`Article too short (${wordCount} words, target 1000-1500)`);
    } else if (wordCount > 1600) {
      issues.push(`Article too long (${wordCount} words, target 1000-1500)`);
    }

    // Check for H1
    if (!article.match(/^#\s+.+/m)) {
      issues.push('Missing H1 heading');
    }

    // Check for category
    if (!article.match(/\*\*Catégorie:\*\*/)) {
      issues.push('Missing category');
    }

    // Check for Résumé section
    if (!article.match(/##\s+Résumé/i)) {
      issues.push('Missing Résumé section');
    }

    // Check for FAQ section
    if (!article.match(/##\s+FAQ/i)) {
      issues.push('Missing FAQ section');
    }

    // Check for CTA
    if (!article.match(/\*\*Call-to-Action:\*\*/i)) {
      issues.push('Missing Call-to-Action');
    }

    // Check for H2 sections
    const h2Count = (article.match(/^##\s+.+/gm) || []).length;
    if (h2Count < 5) {
      issues.push(`Too few sections (${h2Count} H2 headings, minimum 5)`);
    }

    // Check for sources citations
    const citationCount = (article.match(/\[\d+\]/g) || []).length;

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        wordCount,
        h2Count,
        citationCount,
        hasFAQ: article.includes('## FAQ'),
        hasCTA: article.includes('Call-to-Action'),
      },
    };
  }

  /**
   * Create complete article with front-matter
   */
  createCompleteArticle(articleContent, frontMatter, sources) {
    // Add references
    const articleWithRefs = this.addReferences(articleContent, sources);

    // Combine front-matter and content
    const completeArticle = matter.stringify(articleWithRefs, frontMatter);

    return completeArticle;
  }

  /**
   * Generate filename
   */
  generateFilename(topic, article) {
    const date = new Date().toISOString().split('T')[0];
    const title = this.extractTitle(article);
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    }).substring(0, 60);

    return `${date}-${slug}.md`;
  }

  /**
   * Run the writer agent (simplified - no brief needed)
   */
  async run() {
    logger.info('✍️  Writer Agent: Creating article...');

    try {
      // Load ranked topics
      const rankedData = await fileManager.loadRankedTopics();
      if (!rankedData || !rankedData.rankedTopics || rankedData.rankedTopics.length === 0) {
        throw new Error('No ranked topics found. Run scout and ranker first.');
      }

      // Get the best topic
      const topic = rankedData.rankedTopics[0];
      
      logger.info(`Writing article for: ${topic.titre}`);
      logger.info(`Category: ${topic.categorie} | Score: ${topic.scoring?.total || 'N/A'}`);

      // Generate article
      const prompt = this.buildWritingPrompt(topic);
      const result = await complete(prompt, {
        temperature: 0.7,
        maxTokens: 4000, // Augmenté pour articles plus longs et détaillés
      });

      logger.info('Article generated', {
        model: result.model,
        tokensUsed: result.usage?.total_tokens,
      });

      const articleContent = result.content;

      // Validate article
      const validation = this.validateArticle(articleContent);
      
      if (!validation.valid) {
        logger.warn('Article validation issues:', validation.issues);
      }

      logger.info('Article stats:', validation.stats);

      // Generate front-matter
      const frontMatter = this.generateFrontMatter(topic, articleContent);

      // Create complete article
      const completeArticle = this.createCompleteArticle(
        articleContent,
        frontMatter,
        topic.sources
      );

      // Generate filename
      const filename = this.generateFilename(topic, articleContent);

      // Save article
      const filePath = await fileManager.saveArticle(completeArticle, filename);

      logger.success(`Article created: ${filename}`);
      logger.info(`Word count: ${validation.stats.wordCount}`);
      logger.info(`File path: ${filePath}`);

      return {
        article: completeArticle,
        filename,
        filePath,
        validation,
        frontMatter,
      };
    } catch (error) {
      logger.error('Writer Agent failed', error);
      throw error;
    }
  }
}

export default WriterAgent;
