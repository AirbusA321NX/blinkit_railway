import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Mistral } from '@mistralai/mistralai';

dotenv.config();

const apiKey = process.env.MISTRAL_API_KEY;
const mistral = new Mistral({ apiKey });

async function getEmbeddings(text) {
  const result = await mistral.embeddings.create({
    model: 'mistral-embed',
    inputs: [text],
  });
  return result.data[0].embedding;
}

async function ingest() {
  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  const list = Array.isArray(products) ? products : products.products;

  console.log(`Ingesting ${list.length} products...`);
  
  const enriched = [];
  for (const p of list) {
    console.log(`Processing: ${p.name}`);
    const text = `${p.name} ${p.category} ${p.desc}`;
    const embedding = await getEmbeddings(text);
    enriched.push({ ...p, embedding });
  }

  fs.writeFileSync(path.join(process.cwd(), 'data', 'products_embeddings.json'), JSON.stringify(enriched, null, 2));
  console.log("Done!");
}

ingest();
