import { geminiComplete } from '../utils/gemini-client.js';
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
   * Smart truncate at sentence or word boundary with ellipsis
   */
  smartTruncate(text, limit) {
    if (!text) return '';
    if (text.length <= limit) return text;
    const slice = text.slice(0, limit);
    const sentenceEnd = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('… ')
    );
    if (sentenceEnd > 0 && sentenceEnd >= Math.floor(limit * 0.6)) {
      return slice.slice(0, sentenceEnd + 1).trim();
    }
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > 0) return slice.slice(0, lastSpace).trim() + '…';
    return slice.trim() + '…';
  }

  /**
   * Build prompt for article writing with strict structure
   */
  buildWritingPrompt(topic) {
    const isTutorial = topic.tutoriel && topic.tutoriel.etapes_cles && topic.tutoriel.etapes_cles.length > 0;
    
    // Construction dynamique du contexte basé sur la recherche
    let researchContext = '';
    
    if (isTutorial) {
      researchContext += `\n📘 DONNÉES TUTORIEL DISPONIBLES:\n`;
      researchContext += `Pré-requis: ${topic.tutoriel.pre_requis}\n`;
      researchContext += `Étapes clés: ${topic.tutoriel.etapes_cles.join('\n')}\n`;
      researchContext += `Code snippets idées: ${topic.tutoriel.code_snippets_possibles}\n`;
    }

    if (topic.avisCommunautaires && topic.avisCommunautaires.length > 0) {
      researchContext += `\n🗣️ AVIS COMMUNAUTAIRES (Reddit/X):\n`;
      topic.avisCommunautaires.forEach(avis => {
        researchContext += `- ${avis.auteur} sur ${avis.source}: "${avis.avis}"\n`;
      });
    }

    if (topic.analyseConcurrentielle) {
      researchContext += `\n🆚 ANALYSE CONCURRENTIELLE:\n`;
      if (topic.analyseConcurrentielle.concurrents) {
        topic.analyseConcurrentielle.concurrents.forEach(c => {
          researchContext += `- ${c.nom}: ${c.pourquoi_moins_bien || c.forces}\n`;
        });
      }
      if (topic.analyseConcurrentielle.verdict) {
        researchContext += `Verdict: ${topic.analyseConcurrentielle.verdict}\n`;
      }
    }

    const structureType = isTutorial ? 'TUTORIEL / GUIDE PRATIQUE' : 'ANALYSE DE FOND / SUJET CHAUD';

    return `Tu es l'IA de Rédaction de l'Agence Web Beauchoix.fr (Expert MVP & SaaS).
Ton style : NOUS (L'équipe), PRAGMATIQUE, "HANDS-ON", VÉCU.
Tu écris au nom de l'agence pour des fondateurs et devs.

TYPE D'ARTICLE : ${structureType}

📁 DOSSIER DE RECHERCHE:
SUJET: ${topic.titre}
CATÉGORIE: ${topic.categorie}
RÉSUMÉ: ${topic.resume}
IMPACT BUSINESS: ${topic.impact}
${researchContext}

DONNÉES CLÉS & CHIFFRES:
${JSON.stringify(topic.donneesChiffrees || {}, null, 2)}

SOURCES:
${topic.sources?.map((s, i) => `[${i + 1}] ${s.titre}: ${s.url}`).join('\n') || 'N/A'}

🎯 CONTRAINTES DE RÉDACTION:
- Longueur : 1500-2000 mots (Guide complet).
- Format : Markdown riche (H1, H2, H3, Listes, Code blocks, Citations).
- Ton : "Nous" (L'équipe Beauchoix). Bannir le "Je". Utilisez "Nous avons testé", "Notre avis".
- Structure : Logique et fluide.

⚠️ FORMATAGE MARKDOWN STRICT:
- Les listes à puces DOIVENT être sur des lignes séparées avec un saut de ligne avant la liste.
- Format correct:
  
  Voici les points clés :
  
  - Premier point
  - Deuxième point
  - Troisième point

- JAMAIS de listes inline comme "* point1 * point2 * point3" sur une seule ligne.
- Chaque paragraphe doit être séparé par une ligne vide.
- Les titres H2 doivent avoir une ligne vide avant ET après.

STRUCTURE OBLIGATOIRE (${isTutorial ? 'Version Tutoriel' : 'Version Analyse'}):

# [Titre Ultra-Accrocheur avec Bénéfice - ex: "Comment X nous a fait gagner Y"]

**Catégorie:** ${topic.categorie}

## Résumé
[TL;DR de 8 lignes : Le problème, La solution, Ce que vous allez apprendre avec nous]

## Introduction
[Hook émotionnel ou constat marché. "Nous rencontrons souvent ce problème avec nos clients...". Présente l'outil/sujet comme une solution potentielle.]

${isTutorial ? `
## [H2 - Pourquoi cette stack/outil change la donne]
[Analyse rapide : pourquoi maintenant ? Pourquoi ça buzz ? Comparaison avec l'existant.]

## [H2 - Pré-requis et Installation (Le Setup)]
[Guide pas à pas. Commandes terminal simulées si besoin. Configuration initiale.]

## [H2 - Le Tuto : Créer votre premier ${topic.keywords?.[0] || 'projet'}]
[Cœur de l'article. Étape par étape. Explique la logique. Ajoute des "💡 Astuce Beauchoix".]
` : `
## [H2 - Analyse du Marché et du Besoin]
[Pourquoi ce sujet explose. Qui sont les acteurs. Les chiffres clés.]

## [H2 - Deep Dive : Ce qui change vraiment]
[Analyse technique et business. Avantages compétitifs. La "Secret Sauce".]
`}

## [H2 - Les Vrais Retours du Terrain (Avis & Communauté)]
[Utilise les avis communautaires fournis. Sois honnête sur les bugs, le pricing, la DX. "Sur Reddit, nous voyons que..."]

## [H2 - Cas d'Usage : Pour qui est-ce vraiment fait ?]
[Startups ? Entreprises ? Indie Hackers ? Donne des exemples concrets.]

## [H2 - Notre Verdict d'Expert]
[Faut-il l'utiliser en prod en 2026 ? Oui/Non/Peut-être. Note finale sur la maturité.]

## FAQ
### [Question technique fréquente] ?
[Réponse précise]
### [Question sur le pricing/coût] ?
[Réponse chiffrée]

## Conclusion
[Synthèse. Ouverture. Encouragement à tester.]

**Call-to-Action:** [Lien vers Beauchoix : "Besoin d'aide pour intégrer ${topic.titre} dans votre MVP ? Nous pouvons le faire en 3 semaines."]

## Sources
[Liste des sources]

## Post Social Media (LinkedIn/X)
[Rédige un post accrocheur pour LinkedIn/X présentant cet article. Ton : Provocant ou 'Insight', avec des émojis. Termine par le lien de l'article.]
`;
  }

  /**
   * Extract title from article
   */
  extractTitle(article) {
    const match = article.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Untitled';
  }

  /**
   * Extract Social Post
   */
  extractSocialPost(article) {
    const match = article.match(/##\s+Post Social Media.*?\n([\s\S]+?)$/i);
    if (match) {
      return match[1].trim();
    }
    return '';
  }

  /**
   * Remove Social Post from content
   */
  removeSocialPost(article) {
    return article.replace(/##\s+Post Social Media[\s\S]+$/, '').trim();
  }

  /**
   * Extract summary from article (8 lines after ## Résumé)
   */
  extractSummary(article) {
    const match = article.match(/##\s+Résumé\s*\n([\s\S]+?)(?=\n##)/i);
    if (match) {
      // Build a summary up to 3000 chars max, cutting cleanly
      const text = match[1].trim();
      return this.smartTruncate(text, 3000);
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
   * Generate YAML front-matter (simplifié - uniquement champs Webflow + Social)
   */
  generateFrontMatter(topic, article, socialPost = '') {
    const title = this.extractTitle(article);
    const summary = this.extractSummary(article);
    const slug = slugify(title, {
      lower: true,
      strict: true,
    });

    // Enforce excerpt <=3000 (including spaces) at construction time
    const excerpt = summary || this.smartTruncate(topic.resume || '', 3000);

    return {
      title,
      slug,
      category: topic.categorie,
      excerpt,
      social_post: socialPost, // New field for social media intro
      reading_time: this.calculateReadingTime(article),
      seo: {
        title,
        description: (summary || topic.resume || '').substring(0, 155),
        keywords: topic.keywords || [],
      },
      sources: topic.sources?.map(s => ({
        titre: s.titre,
        url: s.url,
        date: s.date || null,
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

    // Check word count (1200-1500 MINIMUM)
    if (wordCount < 1200) {
      issues.push(`Article too short (${wordCount} words, MINIMUM 1200 required)`);
    } else if (wordCount > 1800) {
      issues.push(`Article too long (${wordCount} words, maximum 1800)`);
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

    // Check for Conclusion section
    if (!article.match(/##\s+Conclusion/i)) {
      issues.push('Missing Conclusion section');
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

      // Generate article with up to 3 attempts if length < 1200
      let articleContent = '';
      let validation = { valid: false, issues: [], stats: { wordCount: 0 } };
      const basePrompt = this.buildWritingPrompt(topic);

      for (let attempt = 1; attempt <= 3; attempt++) {
        const prompt = attempt === 1
          ? basePrompt
          : `${basePrompt}\n\nIMPORTANT: Le brouillon précédent faisait ${validation.stats.wordCount} mots. Étends l'article à AU MOINS 1200 mots en développant:\n- L'analyse économique et les implications business (2 paragraphes)\n- Des exemples concrets et chiffrés (2 paragraphes)\n- Une success story détaillée (1-2 paragraphes)\n- La FAQ (ajoute 2 questions pertinentes avec réponses détaillées)\nGarde le ton pédagogique, accrocheur, sans répétitions, et respecte la typographie des titres.`;

        const result = await geminiComplete(prompt, {
          temperature: 0.7,
          maxTokens: 8000, // Articles 1200-1500 mots minimum
        });

        logger.info('Article generated with Gemini', {
          model: result.model,
          tokensUsed: result.usage?.total_tokens,
          attempt,
        });

        articleContent = result.content;
        validation = this.validateArticle(articleContent);
        // Renseigner le wordCount pour la prochaine itération du message
        validation.stats = validation.stats || {};
        validation.stats.wordCount = articleContent.split(/\s+/).length;

        if (!validation.issues.find(i => i.includes('too short'))) {
          break;
        }

        logger.warn(`Article under 1200 words (attempt ${attempt}). Retrying with expansion...`);
      }

      // Validate article (final)
      // Note: validation already computed, keep it for logging and decision
      
      if (!validation.valid) {
        logger.warn('Article validation issues:', validation.issues);
      }

      logger.info('Article stats:', validation.stats);

      // Extract Social Post (Proactive generation)
      const socialPost = this.extractSocialPost(articleContent);
      if (socialPost) {
        logger.info('📱 Social Post extracted');
      }

      // Remove Social Post from content for clean publishing
      const cleanArticleContent = this.removeSocialPost(articleContent);

      // Generate front-matter with social post
      const frontMatter = this.generateFrontMatter(topic, cleanArticleContent, socialPost);

      // Create complete article
      const completeArticle = this.createCompleteArticle(
        cleanArticleContent,
        frontMatter,
        topic.sources
      );

      // Generate filename
      const filename = this.generateFilename(topic, cleanArticleContent);

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
