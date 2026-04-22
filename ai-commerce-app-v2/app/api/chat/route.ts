import { NextResponse } from 'next/server';
import { chatWithMistral, getEmbeddings } from '@/lib/mistral';
import { analyzeImage, performOCR } from '@/lib/nvidia';
import { findSimilarProducts } from '@/lib/vector-store';
import axios from 'axios';

const LETTUCE_SERVICE_URL = "http://localhost:8001/detect";

export async function POST(req: Request) {
  try {
    const { message, image, history = [] } = await req.body;

    console.log(`[CHAT-API] Query: ${message || "Image Search"}`);

    // --- STEP 1: INTENT & GUARDRAIL ---
    const intentPrompt = `Analyze the user query: "${message || 'Uploaded an image'}".
    Is this related to grocery shopping, food, recipes, or diet planning?
    Respond ONLY with JSON: {"is_shopping": true/false, "refined_query": "clean search string"}`;

    const intentRaw = await chatWithMistral([
      { role: "system", content: "You are a shopping intent classifier. Respond ONLY in JSON." },
      { role: "user", content: intentPrompt }
    ], true);
    
    const intent = JSON.parse(intentRaw);

    if (!intent.is_shopping && !image) {
      return NextResponse.json({
        reply: "I am a shopping assistant. May I help you with your groceries or recipes today?",
        products: [],
        intent: "GENERAL"
      });
    }

    // --- STEP 2: CONTEXT GATHERING (RAG / VISION) ---
    let context = "";
    let visualInfo = "";
    let products: any[] = [];

    if (image) {
      console.log("[CHAT-API] Analyzing image with NVIDIA NIM...");
      visualInfo = await analyzeImage(image);
      const ocrData = await performOCR(image);
      context = `User uploaded an image. Visual Analysis: ${visualInfo}. OCR Data: ${ocrData}`;
    }

    const searchQuery = intent.refined_query || message;
    const queryEmbedding = await getEmbeddings(searchQuery + " " + visualInfo);
    products = await findSimilarProducts(queryEmbedding, 5);
    
    const productContext = products.map(p => `- [ID: ${p.id}] ${p.name} | ₹${p.price} | ${p.desc}`).join('\n');
    const fullContext = `${context}\nAvailable Products:\n${productContext}`;

    // --- STEP 3: GENERATE RESPONSE ---
    const responsePrompt = `You are the Blinkit Assistant. 
    Context:
    ${fullContext}

    User: ${message || "What are these items?"}

    Rules:
    1. Only recommend items from the Available Products.
    2. Be helpful and professional.
    3. If no items match, say you couldn't find a direct match.
    4. Output JSON: {"message": "your reply", "recommendations": [id1, id2]}`;

    const rawResponse = await chatWithMistral([
      { role: "system", content: "You are a professional shopping assistant. Respond ONLY in JSON." },
      ...history,
      { role: "user", content: responsePrompt }
    ], true);

    const result = JSON.parse(rawResponse);

    // --- STEP 4: HALLUCINATION GUARDRAIL (LETTUCEDETECT) ---
    try {
      const groundingCheck = await axios.post(LETTUCE_SERVICE_URL, {
        context: [fullContext],
        question: message || "Identify these items",
        answer: result.message
      });

      if (groundingCheck.data.is_hallucination) {
        console.warn("[GUARDRAIL] Hallucination detected! Sanitizing response...");
        result.message = "I've analyzed the products for you! Here are the best matches from our catalog based on your request.";
      }
    } catch (err) {
      console.warn("[GUARDRAIL] LettuceDetect service unavailable, skipping hallucination check.");
    }

    // Map IDs to full products
    const displayProducts = (result.recommendations || []).map((id: any) => {
      return products.find(p => p.id == id);
    }).filter((p: any) => !!p);

    return NextResponse.json({
      reply: result.message,
      products: displayProducts,
      intent: "SHOPPING"
    });

  } catch (error: any) {
    console.error('[CHAT-API-ERROR]', error);
    return NextResponse.json({ error: "I'm having trouble connecting to my AI brain. Please try again." }, { status: 500 });
  }
}
