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
    return `Tu es un rédacteur en chef expert Finance x IA, spécialisé dans les articles de fond style Les Échos.

📁 DOSSIER ÉDITORIAL COMPLET:

SUJET: ${topic.titre}
CATÉGORIE: ${topic.categorie}
RÉSUMÉ: ${topic.resume}
IMPACT BUSINESS: ${topic.impact}

ANGLE ÉDITORIAL:
${topic.angleEditorial || 'Analyser l\'impact business et les implications stratégiques'}

QUESTIONS CENTRALES (à répondre dans l'article):
${topic.questionsCentrales?.map((q, i) => `${i+1}. ${q}`).join('\n') || '1. Quels sont les enjeux ?\n2. Quelles implications pour les entreprises ?\n3. Quelles perspectives d\'avenir ?'}

DONNÉES CHIFFRÉES (à intégrer):
${JSON.stringify(topic.donneesChiffrees || {montants: 'À rechercher', pourcentages: 'À analyser', previsions: 'À projeter'}, null, 2)}

CONTEXTE HISTORIQUE:
${topic.contexteHistorique || 'Situer cette actualité dans son contexte historique et sectoriel'}

COMPARAISONS:
${topic.comparaisons || 'Comparer avec situations similaires, concurrents, autres marchés'}

CITATIONS EXPERTS:
${topic.citationsExperts?.map(c => `- ${c.auteur}: "${c.citation}" (${c.source})`).join('\n') || 'Intégrer des citations si disponibles dans les sources'}

CONTROVERSES/LIMITES:
${topic.controverses || 'Analyser les défis, risques, critiques potentielles'}

SOURCES (${topic.sources?.length || 0}):
${topic.sources?.map((s, i) => `[${i + 1}] ${s.titre}: ${s.url} (${s.date})`).join('\n') || 'N/A'}

OBJECTIF: Créer un article RICHE et DÉTAILLÉ (1500-2000 mots) avec profondeur d'analyse, style Les Échos.

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
14. MINIMUM 1500-2000 mots (article RICHE et DÉTAILLÉ comme Les Échos)
15. Résumé de 8-10 lignes PERCUTANT avec chiffres-clés
16. Sous-titres H3 optimisés SEO avec mots-clés secondaires
17. FAQ avec questions SPÉCIFIQUES et détaillées (pas génériques)
18. Mots-clés naturels: ${topic.keywords?.join(', ') || 'IA, intelligence artificielle, business'}
19. Citations sources avec [1], [2] dans le texte

📰 STYLE LES ÉCHOS - STRUCTURE DÉTAILLÉE (8-14 paragraphes minimum):

INTRODUCTION (2 paragraphes):
20. Paragraphe 1: Exposer le fait marquant, situation de départ, données factuelles ("selon", "aujourd'hui", "face à")
21. Paragraphe 2: Transition vers développement, annoncer les enjeux ("Dans ce contexte", "C'est précisément ce que")

DÉVELOPPEMENT (4-8 paragraphes - CŒUR DE L'ARTICLE):
22. Paragraphes thématiques: Traiter chaque sous-aspect avec données + explication + cause/conséquence
23. Paragraphes de comparaison: Comparer avec autre période/pays ("en comparaison avec", "tandis que")
24. Paragraphes de témoignage: Insérer citations dirigeants/experts ("Selon X", "comme le rappelle Y")
25. Paragraphes de contraste: Montrer risques, contradictions ("Cependant", "mais", "pourtant")
26. Chaque paragraphe = UNE idée centrale, autonome, 3-5 phrases minimum

ANALYSE (2-3 paragraphes):
27. Paragraphe d'interprétation: Signification des faits ("Cela montre que", "Cette évolution suggère")
28. Paragraphe de scénarios: Hypothèses futures ("Si...alors", "à condition que", "dans l'hypothèse où")

CONCLUSION (1 paragraphe):
29. Synthèse + ouverture avec question ("En résumé", "L'enjeu sera de", "Reste à voir si")

TRANSITIONS & FLUIDITÉ:
30. Utiliser connecteurs logiques entre paragraphes (reprise mots-clés, transitions fluides)
31. Varier longueur paragraphes (une phrase seule peut marquer une idée forte)
32. Pyramide inversée: Commencer par le plus important, puis développer

📰 TON & STYLE LES ÉCHOS (CRITIQUE):
33. SOBRE & FACTUEL: Pas d'emphase excessive, pas de superlatifs ("révolution", "absolument"), ton neutre
34. VOIX ACTIVE: Privilégier phrases actives, présent/passé récent pour faits actuels
35. CONDITIONNEL PRUDENT: Pour projections ("pourrait", "faudrait que", "dans l'hypothèse où")
36. CONNECTEURS ADVERSATIFS: "Cependant", "Toutefois", "Or", "Pourtant" pour nuancer
37. VOCABULAIRE PRÉCIS: Termes techniques expliqués, jargon économique maîtrisé
38. PAS DE TON PERSONNEL: Éviter "nous", "on", rester objectif et distant
39. PHRASES COURTES: 3-5 phrases par paragraphe, syntaxe claire et directe

📊 DONNÉES & CRÉDIBILITÉ:
40. CHIFFRES SYSTÉMATIQUES: Chaque affirmation appuyée par données vérifiables
41. ATTRIBUTION SOURCES: "Selon [source]", "d'après [étude]", "[expert] affirme que"
42. COMPARAISONS TEMPORELLES: "+X% par rapport à l'an dernier", évolutions sur période
43. EXEMPLES CONCRETS: Entreprises nommées, cas d'usage précis, secteurs identifiés
44. CITATIONS INTÉGRÉES: Guillemets typographiques, nom + fonction de la personne citée

🎯 ANALYSE & RECUL:
45. DIMENSION EXPLICATIVE: Pas juste "ce qui s'est passé" mais "ce que cela signifie"
46. MISE EN PERSPECTIVE: Historique, internationale, sectorielle
47. CAUSES & FACTEURS: Expliquer les dynamiques sous-jacentes
48. PRUDENCE ANALYTIQUE: "Cela témoigne de", "Cette évolution s'inscrit dans", "On peut y voir"

🔚 CONCLUSION OUVERTE:
49. SYNTHÈSE BRÈVE: Rappel enjeu central en 2-3 phrases
50. OUVERTURE PROSPECTIVE: Question ou défi à venir ("Reste à voir si", "Le défi sera de")
51. PAS DE CONCLUSION FERMÉE: L'actualité continue, histoire en cours

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
