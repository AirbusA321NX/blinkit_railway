import fs from 'fs';
import path from 'path';

export interface Product {
  id: number | string;
  name: string;
  category: string;
  price: number;
  dietary?: string;
  desc: string;
  embedding?: number[];
}

const EMBEDDINGS_PATH = path.join(process.cwd(), 'data', 'products_embeddings.json');

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export async function findSimilarProducts(queryEmbedding: number[], topK: number = 5) {
  if (!fs.existsSync(EMBEDDINGS_PATH)) {
    console.warn('Embeddings file not found. Run ingestion first.');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8')) as Product[];
  
  const scored = data.map(product => {
    if (!product.embedding) return { product, score: 0 };
    return {
      product,
      score: cosineSimilarity(queryEmbedding, product.embedding)
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.product);
}

export async function saveEmbeddings(products: Product[]) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(products, null, 2));
}
