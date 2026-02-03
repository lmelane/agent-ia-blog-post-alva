import { perplexitySearchJSON } from '../utils/perplexity-client.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import fileManager from '../utils/file-manager.js';

/**
 * Scout Agent - Discovers hot AI topics using Deep Research
 * Returns strict JSON format with categorization
 */
export class ScoutAgent {
  constructor() {
    this.topics = config.topics;
    this.categories = config.categories;
    this.freshnessWindow = config.deepResearch.freshnessWindow;
  }

  /**
   * Build research prompt for Deep Research (returns JSON)
   */
  buildResearchPrompt() {
    const categoriesStr = this.categories.join(', ');
    const topicsStr = this.topics.join(', ');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    return `Tu es un expert en veille technologique pour une Agence Web (Beauchoix.fr).
Ta mission : Identifier 5 à 10 sujets "chauds" ou des outils émergents qui méritent un tutoriel complet ou une analyse approfondie.

CIBLE : Développeurs, Fondateurs, Indie Hackers.

THÈMES PRIORITAIRES (Mots-clés) :
${topicsStr}

SOURCES À PRIVILÉGIER :
- Discussions virales sur X (Twitter) et LinkedIn (Tech).
- Threads populaires sur Reddit (r/webdev, r/SaaS, r/startups).
- Nouveaux outils sur Product Hunt ou GitHub Trending.
- Mises à jour majeures de frameworks (Next.js, React, Supabase, etc.).

TYPE DE SUJETS RECHERCHÉS :
1. "How-to" / Tutoriels sur une stack moderne (ex: "Comment utiliser MoltBot pour coder une app en 1h").
2. Comparatifs d'outils No-Code/Low-Code qui buzzent.
3. Retours d'expérience concrets ("Pourquoi j'ai quitté Vercel pour Railway").
4. Analyses de tendances de fond (ex: "La fin du SaaS par abonnement ?").

CONTRAINTES :
- Ne te limite pas strictement aux dernières 48h si un sujet est très pertinent et actuel.
- Cherche le "Signal" au milieu du "Bruit".
- L'angle doit être : "Voici l'outil dont tout le monde parle, on vous explique comment l'utiliser concrètement".

DATE COURANTE: ${today.toISOString()}

RENVOIE UNIQUEMENT DU JSON STRICT AU FORMAT SUIVANT:
{
  "topics": [
    {
      "titre": "Titre accrocheur (Style YouTube/Medium)",
      "resume": "Ce que c'est + Pourquoi c'est hot",
      "impact": "Valeur ajoutée pour le lecteur (Gain de temps, Argent, Compétence)",
      "categorie": "ONE of: ${categoriesStr}",
      "angleEditorial": "Tutorial / Deep Dive / Retour d'expérience",
      "questionsCentrales": ["Comment ça marche ?", "Combien ça coûte ?", "Limites ?"],
      "donneesChiffrees": {"metrics": "Stars GitHub, Upvotes, Views"},
      "contexteHistorique": "D'où ça sort ?",
      "comparaisons": "Vs l'ancien standard",
      "citationsExperts": [{"auteur": "@user", "citation": "Tweet/Commentaire pertinent", "source": "X/Reddit"}],
      "controverses": "Points de friction (Pricing, Bugs, Lock-in)",
      "sources": [{"titre": "Thread/Repo/Launch", "url": "https://...", "date": "Recent", "typeSource": "social/tech"}],
      "keywords": ["tool", "stack", "problem"],
      "publishDate": "${todayStr}T10:00:00Z"
    }
  ]
}
`;
  }

  /**
   * Validate topic freshness (≤ freshnessWindow hours)
   */
  isTopicFresh(publishDate) {
    const now = new Date();
    const pubDate = new Date(publishDate);
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);
    return hoursAgo <= this.freshnessWindow;
  }

  /**
   * Validate category against configured categories
   */
  isValidCategory(category) {
    return this.categories.includes(category);
  }

  /**
   * Validate and clean topics from JSON response
   */
  validateTopics(topics) {
    const validTopics = [];

    for (const topic of topics) {
      if (!topic.titre || !topic.resume || !topic.impact || !topic.categorie) {
        logger.warn('Topic missing required fields, skipping', { titre: topic.titre });
        continue;
      }

      if (!this.isValidCategory(topic.categorie)) {
        logger.warn(`Invalid category "${topic.categorie}" for topic "${topic.titre}"`, {
          validCategories: this.categories,
        });
        topic.categorie = 'Fintech & Innovation';
      }

      if (topic.publishDate && !this.isTopicFresh(topic.publishDate)) {
        logger.warn(`Topic too old (>${this.freshnessWindow}h): ${topic.titre}`);
        continue;
      }

      if (!topic.sources || topic.sources.length === 0) {
        logger.warn(`Topic has no sources: ${topic.titre}`);
        continue;
      }

      topic.discoveredAt = new Date().toISOString();
      topic.sourceCount = topic.sources.length;
      validTopics.push(topic);
    }

    return validTopics;
  }

  /**
   * Run the scout agent with JSON response
   */
  async run() {
    logger.info('🔍 Scout Agent: Starting Perplexity Search...');

    try {
      const prompt = this.buildResearchPrompt();
      logger.info('Calling Perplexity API...');

      const result = await perplexitySearchJSON(prompt, {
        temperature: 0.7,
        systemPrompt: 'You are an AI research assistant that returns structured JSON data about trending AI news. Search the web for the latest news and return valid JSON only.',
      });

      logger.info('Perplexity search completed', {
        model: result.model,
        tokensUsed: result.usage?.total_tokens,
        citationsCount: result.citations?.length || 0,
      });

      const jsonData = result.data;
      if (!jsonData.topics || !Array.isArray(jsonData.topics)) {
        throw new Error('Invalid JSON response: missing topics array');
      }

      logger.info(`Raw topics discovered: ${jsonData.topics.length}`);
      const validTopics = this.validateTopics(jsonData.topics);
      logger.success(`Valid topics after filtering: ${validTopics.length}`);

      const byCategory = {};
      validTopics.forEach(topic => {
        byCategory[topic.categorie] = (byCategory[topic.categorie] || 0) + 1;
      });
      logger.info('Topics by category:', byCategory);

      await fileManager.saveScoutResults({
        topics: validTopics,
        metadata: {
          scoutedAt: new Date().toISOString(),
          model: result.model,
          usage: result.usage,
          totalDiscovered: jsonData.topics.length,
          validTopics: validTopics.length,
          categoriesDistribution: byCategory,
        },
      });

      return {
        topics: validTopics,
        metadata: {
          totalDiscovered: jsonData.topics.length,
          validTopics: validTopics.length,
          categoriesDistribution: byCategory,
        },
      };
    } catch (error) {
      logger.error('Scout Agent failed', error);
      throw error;
    }
  }
}

export default ScoutAgent;
