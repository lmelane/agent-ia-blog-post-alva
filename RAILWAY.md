# 🚂 Déploiement sur Railway

## Configuration Requise

### Variables d'Environnement

Ajoutez ces variables dans Railway :

```bash
OPENAI_API_KEY=your_openai_api_key
REVE_API_KEY=your_reve_api_key
WEBFLOW_API_KEY=your_webflow_api_key
WEBFLOW_COLLECTION_ID=68df71f0967ceb1c97fb8199
TOPICS=artificial intelligence,machine learning,AI agents,generative AI
MIN_SCORE_TO_PUBLISH=70
```

## Déploiement

1. **Connectez votre repo GitHub à Railway**
   - Allez sur [railway.app](https://railway.app)
   - New Project → Deploy from GitHub repo
   - Sélectionnez `agent-ia-blog-post-alva`

2. **Ajoutez les variables d'environnement**
   - Settings → Variables
   - Ajoutez toutes les variables ci-dessus

3. **Déployez**
   - Railway détectera automatiquement Node.js
   - Le service démarrera avec `npm start`
   - Le cron s'exécutera automatiquement à 9h chaque jour

## Fonctionnement

- **Cron quotidien** : 9h00 (Europe/Paris)
- **Pipeline complet** : Scout → Ranker → Writer → Thumbnail → Publisher
- **Publication automatique** sur Webflow

## Logs

Consultez les logs dans Railway Dashboard pour suivre :
- Génération d'articles
- Publication Webflow
- Erreurs éventuelles

## Commandes Manuelles

Vous pouvez aussi exécuter manuellement via Railway CLI :
```bash
railway run npm run full-pipeline
```
