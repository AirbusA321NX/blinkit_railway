const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const apiKey = process.env.NVIDIA_API_KEY;

export async function analyzeImage(base64Image: string, prompt: string = "Analyze this image for grocery items or diet plans. List everything you see.") {
  if (!apiKey) throw new Error('NVIDIA_API_KEY is missing');

  const base64Data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;

  const payload = {
    model: "google/gemma-3-27b-it",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
        ]
      }
    ],
    max_tokens: 1024,
    temperature: 0.2,
    top_p: 0.7
  };

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('NVIDIA Image Analysis Error:', error);
    throw error;
  }
}

/**
 * Specifically for OCR task on grocery lists or diet charts
 */
export async function performOCR(base64Image: string) {
  return analyzeImage(base64Image, "Extract all text from this image accurately. If it's a grocery list or diet chart, preserve the list format.");
}
