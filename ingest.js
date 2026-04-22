const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Mistral } = require('@mistralai/mistralai');

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

async function getEmbeddings(text) {
  const result = await mistral.embeddings.create({
    model: 'mistral-embed',
    inputs: [text],
  });
  return result.data[0].embedding;
}

async function ingest() {
  // Use products.json provided by the user in the root or common path
  const productsPath = path.join(__dirname, 'products.json');
  if (!fs.existsSync(productsPath)) {
      console.error("products.json not found in root!");
      return;
  }
  
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  const list = Array.isArray(products) ? products : products.products;

  console.log(`Ingesting ${list.length} products...`);
  
  const enriched = [];
  for (const p of list) {
    console.log(`Processing: ${p.name}`);
    const text = `${p.name} ${p.category} ${p.desc}`;
    try {
        const embedding = await getEmbeddings(text);
        enriched.push({ ...p, embedding });
    } catch (err) {
        console.error(`Failed to embed ${p.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'products_embeddings.json'), JSON.stringify(enriched, null, 2));
  console.log("Done! Vector Store Ready.");
}

ingest();
