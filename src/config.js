import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  // Perplexity Configuration (for search/research)
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY,
    model: process.env.PERPLEXITY_MODEL || 'sonar-pro',
  },

  // Gemini Configuration (for writing)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },

  // Scheduling
  schedule: {
    timezone: process.env.TZ || 'Europe/Paris',
    cronExpression: '30 8 * * *', // 08:30 every day
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
      amplitude: 15,
      impact_financier: 30, // surpondération de l'impact financier
      actionability: 15,
    },
  },
  
  // Topics (Beauchoix Agency Focus: MVP, SaaS, AI, Startup)
  topics: (process.env.topics || [
    // MVP & Product Launch
    'MVP development','startup MVP','product market fit','lean startup','rapid prototyping','app launch strategy','time to market',
    // SaaS & Web Dev
    'SaaS trends','web app development','no-code vs code','scalable architecture','tech debt','SaaS pricing models','micro-SaaS',
    // AI & Automation (Business focused)
    'AI agents for business','business automation','AI workflow optimization','generative AI for startups','LLM integration',
    // Entrepreneurship & Growth
    'startup growth strategies','bootstrapping','solopreneurship','digital transformation','founder mistakes'
  ].join(','))
    .split(',')
    .map(t => t.trim()),

  // Categories for topic classification (Adapted for Beauchoix)
  categories: [
    'Lancement & MVP',            // Stratégies de lancement, Time-to-market, Validation
    'SaaS & Tech',                // Développement, Architecture, Outils, Stack
    'IA & Automatisation',        // Agents IA, Productivité, Workflows
    'Entrepreneuriat & Growth',   // Croissance, Marketing produit, Stratégie
    'Design & UX',                // Expérience utilisateur, UI, Conversion
    'Business & Stratégie',       // Modèles économiques, Pricing, Levée vs Bootstrap
    'No-Code & Low-Code',         // Outils, Rapidité, Limites
    'Cas Clients & Success'       // Études de cas, Retours d'expérience
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

  // CMS (Database only)
  cms: {
    // No external CMS configuration needed as we use internal Database
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
