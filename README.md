# Agent IA de Création d'Articles Quotidiens

Agent IA automatisé qui utilise l'API OpenAI Deep Research pour créer des articles quotidiens sur l'intelligence artificielle.

## 🎯 Fonctionnalités

### Workflow Automatisé (4 étapes)

1. **Scout** : Veille automatique via Deep Research + Web Search
   - Recherche des actualités IA des dernières 72h
   - Retour JSON strict avec catégorisation automatique
   - Validation des sources et dates

2. **Ranker** : Scoring intelligent des sujets
   - Fraîcheur (≤72h)
   - Autorité des sources
   - Amplitude (couverture multi-sources)
   - Impact business/tech
   - Actionnabilité

3. **Writer** : Génération d'articles structurés
   - 1000-1500 mots
   - Résumé de 8 lignes
   - Section FAQ
   - Call-to-Action
   - Front-matter YAML complet

4. **Publisher** : Publication CMS (optionnel)
   - WordPress, Ghost, ou CMS personnalisé

### Catégorisation Automatique (7 catégories)

Chaque sujet est automatiquement assigné à l'une des 7 catégories :
- **Entreprise** : Actualités d'entreprises, partenariats, stratégie
- **Technologie** : Innovations techniques, algorithmes, outils
- **Économie** : Financements, valorisations, tendances marché
- **Marketing** : Applications marketing, engagement client
- **Santé** : Applications médicales, diagnostics IA
- **Culture** : Impact sociétal, éthique, créativité
- **Carrière** : Emplois, compétences, formation

## 📋 Prérequis

- Node.js >= 18.0.0
- Clé API OpenAI avec accès aux modèles Deep Research

## 🚀 Installation

```bash
npm install
```

## ⚙️ Configuration

1. Copiez `.env.example` vers `.env`
2. Ajoutez votre clé API OpenAI
3. Configurez les paramètres selon vos besoins

```bash
cp .env.example .env
```

## 📖 Utilisation

### Mode Automatique (Scheduler)

Lance l'agent en mode daemon avec exécution quotidienne à 09:00 :

```bash
npm start
```

### Mode Manuel (CLI)

Exécutez chaque étape individuellement :

```bash
# 1. Veille des sujets (Deep Research ≤72h)
npm run scout

# 2. Scoring et ranking des sujets
npm run rank

# 3. Rédaction de l'article (meilleur sujet)
npm run write

# Pipeline complet (scout → rank → write → publish)
npm run full-pipeline

# Lister les articles générés
node src/cli.js list

# Voir le statut actuel
node src/cli.js status
```

## 🏗️ Architecture

```
src/
├── index.js              # Point d'entrée avec scheduler (09:00 quotidien)
├── cli.js                # Interface CLI
├── config.js             # Configuration centralisée
├── pipeline.js           # Orchestrateur du workflow complet
├── agents/
│   ├── scout.js          # Veille IA Business (gpt-4o-search-preview)
│   ├── ranker.js         # Scoring simplifié (fraîcheur + sources)
│   ├── writer.js         # Rédaction professionnelle (1200-1500 mots)
│   ├── thumbnail.js      # Génération d'images (Reve.com)
│   └── publisher.js      # Publication CMS (optionnel)
└── utils/
    ├── openai-client.js  # Client OpenAI (Deep Research + JSON)
    ├── logger.js         # Système de logs
    └── file-manager.js   # Gestion des fichiers
```

## 🎯 Catégories d'Articles (8 catégories IA Business)

1. 🚀 **Lancements Produits** - Nouveaux modèles IA, APIs, plateformes
2. 💰 **Financements & Deals** - Levées de fonds, acquisitions, valorisations
3. 🛠️ **Outils & Plateformes** - SaaS IA, productivité, automatisation
4. 📈 **Marketing & Ventes** - IA marketing, CRM, engagement client
5. 📊 **Stratégie & Tendances** - Analyses marché, prévisions, stratégie
6. ⚖️ **Régulations & Politique** - Lois IA, compliance, éthique
7. 💼 **Cas d'Usage** - Success stories, ROI, implémentations réelles
8. 🤝 **Partenariats** - Collaborations stratégiques, alliances

**Focus exclusif** : IA Business/Entreprise/Économie (pas de recherche académique)

## 📝 Format des Articles

Structure stricte des articles générés :

```markdown
---
title: "Titre de l'article"
slug: "titre-de-l-article"
date: "2025-10-03T09:00:00.000Z"
category: "Technologie"
tags: ["IA", "Machine Learning"]
excerpt: "Résumé de l'article..."
reading_time: 7
seo:
  title: "Titre SEO"
  description: "Description SEO"
  keywords: ["keyword1", "keyword2"]
sources:
  - titre: "Source 1"
    url: "https://..."
    date: "2025-10-01"
---

# Titre Accrocheur

**Catégorie:** Technologie

## Résumé
[Exactement 8 lignes de résumé engageant]

## Introduction
[2-3 paragraphes d'introduction]

## Section Principale 1
[Contenu détaillé avec citations [1]]

## Section Principale 2
[Contenu avec données et exemples]

## FAQ

### Question pertinente 1 ?
Réponse concise.

### Question pertinente 2 ?
Réponse concise.

## Conclusion
[Résumé et perspectives]

**Call-to-Action:** [Incitation claire à l'action]

## Sources
1. [Source 1](https://...) (2025-10-01)
2. [Source 2](https://...) (2025-10-02)
```

## 🔧 Développement

```bash
# Mode développement avec hot-reload
npm run dev

# Tests
npm test
```

## 📄 Licence

MIT
