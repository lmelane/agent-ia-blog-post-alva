import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    deepResearchModel: process.env.DEEP_RESEARCH_MODEL || 'o4-mini-deep-research',
    standardModel: process.env.STANDARD_MODEL || 'gpt-4o',
  },

  // Scheduling
  schedule: {
    timezone: process.env.TZ || 'Europe/Paris',
    cronExpression: '0 9 * * *', // 09:00 every day
  },

  // Output
  output: {
    articlesDir: process.env.OUTPUT_DIR || './articles',
    logsDir: './logs',
  },

  // Scoring
  scoring: {
    minScoreToPublish: parseInt(process.env.MIN_SCORE_TO_PUBLISH || '70', 10),
    weights: {
      freshness: 20,
      authority: 20,
      amplitude: 20,
      impact: 20,
      actionability: 20,
    },
  },
  
  // Topics
  topics: (process.env.topics || 'artificial intelligence,machine learning,large language models,AI agents,generative AI,AI regulations')
    .split(',')
    .map(t => t.trim()),

  // Categories for topic classification (8 grandes catégories IA Business)
  categories: [
    'Innovation & Produits',        // Lancements produits, nouveaux modèles IA, innovations
    'Finance & Investissement',     // Levées de fonds, acquisitions, valorisations, IPOs
    'Outils & Technologies',        // Plateformes SaaS, outils productivité, APIs, frameworks
    'Marketing & Ventes',           // Marketing automation, CRM IA, customer engagement
    'Analyse & Tendances',          // Études marché, rapports, prévisions, insights
    'Régulation & Éthique',         // Lois IA, compliance, gouvernance, éthique
    'Business & Stratégie',         // Stratégie entreprise, transformation, ROI, cas d\'usage
    'Partenariats & Écosystème'     // Collaborations stratégiques, alliances, intégrations
  ],

  // Article structure
  article: {
    minWordCount: 1000,
    includeFAQ: true,
    includeCTA: true,
  },

  // CMS (optional)
  cms: {
    type: process.env.CMS_TYPE || null,
    apiUrl: process.env.CMS_API_URL || null,
    apiKey: process.env.CMS_API_KEY || null,
  },

  // Deep Research Configuration
  deepResearch: {
    maxSources: 10,
    maxSearchResults: 20,
    freshnessWindow: 48, // hours (48h = 2 jours)
  },
};

export default config;
