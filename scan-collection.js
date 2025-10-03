import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const WEBFLOW_API_KEY = process.env.WEBFLOW_API_KEY;
const COLLECTION_ID = '68df71f0967ceb1c97fb8199';

const response = await fetch(`https://api.webflow.com/v2/collections/${COLLECTION_ID}`, {
  headers: {
    'Authorization': `Bearer ${WEBFLOW_API_KEY}`,
    'accept': 'application/json',
  },
});

const data = await response.json();

console.log('\n✅ Collection:', data.displayName);
console.log('ID:', data.id);
console.log('Slug:', data.slug);
console.log('\n📋 Champs:\n');

data.fields?.forEach((field, i) => {
  console.log(`${i + 1}. ${field.displayName}`);
  console.log(`   Slug: ${field.slug}`);
  console.log(`   Type: ${field.type}`);
  console.log(`   Required: ${field.isRequired ? 'Oui' : 'Non'}`);
  console.log('');
});
