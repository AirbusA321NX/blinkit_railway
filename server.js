const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env manually if it exists
const env = process.env;
try {
    if (fs.existsSync('.env')) {
        const envContent = fs.readFileSync('.env', 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) env[key.trim()] = value.trim();
        });
    }
} catch (e) {
    console.log("No .env file found, using system environment variables.");
}

const PORT = process.env.PORT || 3000;
const MISTRAL_API_KEY = env['MISTRAL_API_KEY'];
const NVIDIA_API_KEY = env['NVIDIA_API_KEY'];

// Load Products
const productsPath = path.join(__dirname, 'products.json');
let products = [];
try {
    products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
} catch (e) {
    console.error("products.json not found at: ", productsPath);
}

function cosineSimilarity(a, b) {
    if (!a || !b) return 0;
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
}

async function getEmbedding(text) {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            model: "mistral-embed",
            input: [text]
        });
        const options = {
            hostname: 'api.mistral.ai',
            path: '/v1/embeddings',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            }
        };
        const req = https.request(options, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (result.data) resolve(result.data[0].embedding);
                    else resolve(null);
                } catch (e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.write(data);
        req.end();
    });
}

async function analyzeImage(base64) {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            model: "google/gemma-3-27b-it",
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: "Read this medical prescription or grocery list. List all items found. Return ONLY the list of items." },
                    { type: "image_url", image_url: { url: base64 } }
                ]
            }],
            max_tokens: 512
        });
        const options = {
            hostname: 'integrate.api.nvidia.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`
            }
        };
        const req = https.request(options, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (result.choices && result.choices[0]) resolve(result.choices[0].message.content);
                    else resolve("Could not read image.");
                } catch (e) { resolve("Could not read image."); }
            });
        });
        req.on('error', () => resolve("Vision API error."));
        req.write(data);
        req.end();
    });
}

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            let { message, image } = JSON.parse(body);
            
            try {
                if (image) {
                    const visionText = await analyzeImage(image);
                    message = `[Image OCR: ${visionText}] ${message || ""}`;
                }

                const purifiedMessage = (message || "").replace(/\[Image OCR: .*\]/g, '').trim() || "groceries";
                const words = purifiedMessage.toLowerCase().split(/[ ,.!]+/).filter(w => w.length > 2);

                const data = JSON.stringify({
                    model: "mistral-large-latest",
                    messages: [
                        { role: "system", content: "You are the Blinkit AI Shopping Concierge. GROCERY ONLY. Respond in PLAIN TEXT. Max 2 sentences." },
                        { role: "user", content: message || "Identify these items" }
                    ]
                });

                const options = {
                    hostname: 'api.mistral.ai',
                    path: '/v1/chat/completions',
                    method: 'POST',
                    timeout: 60000, // 60s timeout
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${MISTRAL_API_KEY}`
                    }
                };

                const apiReq = https.request(options, apiRes => {
                    console.log(`Mistral Status: ${apiRes.statusCode}`);
                    let resBody = '';
                    apiRes.on('data', d => resBody += d);
                    apiRes.on('end', () => {
                        try {
                            const mistralRes = JSON.parse(resBody);
                            const reply = mistralRes.choices ? mistralRes.choices[0].message.content : "Error reaching AI.";
                            
                            // 1. Get Candidates (Keyword)
                            const words = purifiedMessage.toLowerCase().split(/[ ,.!]+/).filter(w => w.length > 2);
                            const candidates = products
                                .map(p => {
                                    const pText = (p.name + ' ' + p.category + ' ' + p.desc).toLowerCase();
                                    let score = words.reduce((s, w) => s + (pText.includes(w) ? 1 : 0), 0);
                                    return { ...p, score };
                                })
                                .filter(p => p.score > 0)
                                .sort((a, b) => b.score - a.score)
                                .slice(0, 15);

                            // 2. Ask Mistral to Rerank (Sub-Request)
                            const rerankData = JSON.stringify({
                                model: "mistral-large-latest",
                                messages: [
                                    { role: "system", content: "From this JSON list of products, pick the 4 most RELEVANT to the user's need. Return ONLY a comma-separated list of IDs. Example: 1, 5, 12, 102" },
                                    { role: "user", content: `User Need: ${purifiedMessage}\nProducts: ${JSON.stringify(candidates.map(c => ({ id: c.id, name: c.name, desc: c.desc })))}` }
                                ]
                            });

                            const rerankOptions = {
                                hostname: 'api.mistral.ai',
                                path: '/v1/chat/completions',
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${MISTRAL_API_KEY}`
                                }
                            };

                            const rerankReq = https.request(rerankOptions, rerankRes => {
                                let rrBody = '';
                                rerankRes.on('data', d => rrBody += d);
                                rerankRes.on('end', () => {
                                    try {
                                        const rrJson = JSON.parse(rrBody);
                                        const ids = rrJson.choices[0].message.content.split(',').map(id => id.trim());
                                        const finalRecs = products.filter(p => ids.includes(p.id.toString()));
                                        
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ reply, products: finalRecs, source: "Mistral AI" }));
                                    } catch (e) {
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ reply, products: candidates.slice(0, 4), source: "Mistral AI (Fallback)" }));
                                    }
                                });
                            });
                            rerankReq.write(rerankData);
                            rerankReq.end();
                        } catch (e) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ reply: "Error reranking products.", products: [], source: "Local Fallback" }));
                        }
                    });
                });
                apiReq.on('error', () => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: "Local catalog results below.", products: products.slice(0, 4), source: "Local Fallback" }));
                });
                apiReq.write(data);
                apiReq.end();

            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    if (extname === '.js') contentType = 'text/javascript';
    if (extname === '.css') contentType = 'text/css';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end("File not found");
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Blinkit AI V2 (Zero-Dep) running at http://localhost:${PORT}`);
});
