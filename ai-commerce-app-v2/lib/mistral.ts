import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
  throw new Error('MISTRAL_API_KEY is missing from environment variables');
}

export const mistral = new Mistral({ apiKey });

export async function getEmbeddings(text: string) {
  try {
    const result = await mistral.embeddings.create({
      model: 'mistral-embed',
      inputs: [text],
    });
    return result.data[0].embedding;
  } catch (error) {
    console.error('Mistral Embedding Error:', error);
    throw error;
  }
}

export async function chatWithMistral(messages: any[], jsonMode = false) {
  try {
    const result = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages,
      responseFormat: jsonMode ? { type: 'json_object' } : undefined,
    });
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Mistral Chat Error:', error);
    throw error;
  }
}
