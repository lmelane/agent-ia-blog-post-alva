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
  
  // Topics (Finance x IA focus)
  topics: (process.env.topics || 'AI in finance,fintech AI,algorithmic trading,robo-advisors,AI fraud detection,banking AI,insurance AI,wealth management AI')
    .split(',')
    .map(t => t.trim()),

  // Categories for topic classification (8 catégories Finance x IA)
  categories: [
    'Trading & Investissement',     // Trading algorithmique, robo-advisors, gestion de portefeuille IA
    'Banque & Paiements',           // Néobanques IA, paiements intelligents, crédit scoring IA
    'Assurance & Risques',          // Assurtech, évaluation risques, tarification dynamique IA
    'Détection Fraude & Sécurité',  // Anti-fraude IA, cybersécurité financière, AML/KYC
    'Fintech & Innovation',         // Startups fintech IA, levées de fonds, nouveaux produits
    'Régulation & Compliance',      // Régulations financières IA, RegTech, conformité
    'Analyse & Prévisions',         // Analyse prédictive, market intelligence, forecasting IA
    'Crypto & DeFi'                 // Finance décentralisée IA, blockchain + IA, crypto trading
  ],

  // Article structure (style Les Échos - articles riches)
  article: {
    minWordCount: 800,      // Minimum pour articles standards
    targetWordCount: 1200,  // Objectif pour articles complets
    maxWordCount: 1500,     // Maximum pour articles standards
    dossierWordCount: 2000, // Pour dossiers approfondis
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

  // Thumbnail generation profile (editorial/documentary tuning)
  thumbnail: {
    editorial_profile: {
      film_stock: process.env.THUMB_FILM_STOCK || 'Portra 400',           // e.g., 'Portra 400' | 'Tri-X 400' | 'Kodak Gold'
      time_of_day: process.env.THUMB_TIME_OF_DAY || 'daylight',          // e.g., 'morning light' | 'golden hour' | 'night indoor'
      location_bias: process.env.THUMB_LOCATION || 'office',             // e.g., 'trading floor' | 'bank branch' | 'factory' | 'office'
      faces: process.env.THUMB_FACES || 'allow',                         // 'allow' | 'avoid'
      aspect_ratio: process.env.THUMB_ASPECT_RATIO || '16:9',            // aspect ratio hint
    },
  },
};

export default config;
