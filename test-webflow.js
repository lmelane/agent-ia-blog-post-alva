#!/usr/bin/env node

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const WEBFLOW_API_KEY = process.env.WEBFLOW_API_KEY || '29a7ad872a6599fdac30be81849502e20a22ee072f173b3f1fde2b5fb2526e93';
const API_URL = 'https://api.webflow.com/v2';

console.log('🔍 Test Webflow API - Site "alva-2"\n');
console.log('═'.repeat(60));

async function listSites() {
  console.log('\n📡 Étape 1: Liste des sites...\n');
  
  const response = await fetch(`${API_URL}/sites`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_KEY}`,
      'accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur API: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  console.log(`✅ ${data.sites?.length || 0} site(s) trouvé(s):\n`);
  
  data.sites?.forEach((site, i) => {
    console.log(`${i + 1}. ${site.displayName || site.shortName}`);
    console.log(`   ID: ${site.id}`);
    console.log(`   Short Name: ${site.shortName}`);
    console.log('');
  });

  // Trouver "alva-2"
  const alvaSite = data.sites?.find(s => 
    s.shortName === 'alva-2' || 
    s.displayName?.toLowerCase().includes('alva')
  );

  if (!alvaSite) {
    console.log('❌ Site "alva-2" non trouvé');
    return null;
  }

  console.log(`✅ Site "alva-2" trouvé: ${alvaSite.id}\n`);
  return alvaSite.id;
}

async function listCollections(siteId) {
  console.log('📡 Étape 2: Liste des collections...\n');
  
  const response = await fetch(`${API_URL}/sites/${siteId}/collections`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_KEY}`,
      'accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur API: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  console.log(`✅ ${data.collections?.length || 0} collection(s) trouvée(s):\n`);
  
  data.collections?.forEach((collection, i) => {
    console.log(`${i + 1}. ${collection.displayName || collection.slug}`);
    console.log(`   ID: ${collection.id}`);
    console.log(`   Slug: ${collection.slug}`);
    console.log(`   Singular Name: ${collection.singularName}`);
    console.log('');
  });

  return data.collections;
}

async function getCollectionFields(collectionId, collectionName) {
  console.log(`📡 Étape 3: Champs de la collection "${collectionName}"...\n`);
  
  const response = await fetch(`${API_URL}/collections/${collectionId}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_KEY}`,
      'accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur API: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  console.log(`✅ Champs de "${collectionName}":\n`);
  
  data.fields?.forEach((field, i) => {
    console.log(`${i + 1}. ${field.displayName || field.slug}`);
    console.log(`   Slug: ${field.slug}`);
    console.log(`   Type: ${field.type}`);
    console.log(`   Required: ${field.isRequired ? 'Oui' : 'Non'}`);
    console.log('');
  });

  return data.fields;
}

async function run() {
  try {
    const siteId = await listSites();
    
    if (!siteId) {
      console.log('\n❌ Impossible de continuer sans site ID');
      return;
    }

    const collections = await listCollections(siteId);
    
    if (collections && collections.length > 0) {
      // Afficher les champs de la première collection (ou celle qui ressemble à "blog" ou "articles")
      const blogCollection = collections.find(c => 
        c.slug?.includes('blog') || 
        c.slug?.includes('article') ||
        c.slug?.includes('post')
      ) || collections[0];

      console.log('═'.repeat(60));
      await getCollectionFields(blogCollection.id, blogCollection.displayName);
    }

    console.log('═'.repeat(60));
    console.log('\n✅ Test terminé avec succès!\n');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

run();
