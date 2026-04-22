import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getEmbeddings } from '@/lib/mistral';
import { saveEmbeddings, Product } from '@/lib/vector-store';

export async function POST() {
  try {
    const productsPath = path.join(process.cwd(), 'data', 'products.json');
    if (!fs.existsSync(productsPath)) {
      return NextResponse.json({ error: 'products.json not found' }, { status: 404 });
    }

    const rawData = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    const products: Product[] = Array.isArray(rawData) ? rawData : rawData.products || [];

    console.log(`Starting ingestion for ${products.length} products...`);

    const enrichedProducts: Product[] = [];

    // Process in batches to avoid API rate limits
    for (const product of products) {
      const textToEmbed = `${product.name} ${product.category} ${product.dietary || ''} ${product.desc}`;
      const embedding = await getEmbeddings(textToEmbed);
      enrichedProducts.push({ ...product, embedding });
      
      // Small delay between products
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await saveEmbeddings(enrichedProducts);

    return NextResponse.json({ success: true, count: enrichedProducts.length });
  } catch (error: any) {
    console.error('Ingestion Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
