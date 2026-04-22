const https = require('https');
const fs = require('fs');

// Load .env
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const MISTRAL_KEY = env['MISTRAL_API_KEY'];
const NVIDIA_KEY = env['NVIDIA_API_KEY'];

async function testMistral() {
    console.log("Testing Mistral...");
    return new Promise((resolve) => {
        const data = JSON.stringify({
            model: "mistral-large-latest",
            messages: [{ role: "user", content: "Say 'Mistral OK'" }]
        });
        const options = {
            hostname: 'api.mistral.ai',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_KEY}`
            }
        };
        const req = https.request(options, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                console.log("Mistral Response:", body.slice(0, 100));
                resolve(body.includes("Mistral OK"));
            });
        });
        req.on('error', e => { console.error("Mistral Error:", e); resolve(false); });
        req.write(data);
        req.end();
    });
}

async function testNvidia() {
    console.log("Testing NVIDIA Vision...");
    return new Promise((resolve) => {
        const data = JSON.stringify({
            model: "google/gemma-3-27b-it",
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: "Say 'Nvidia OK'" }
                ]
            }]
        });
        const options = {
            hostname: 'integrate.api.nvidia.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_KEY}`
            }
        };
        const req = https.request(options, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                console.log("Nvidia Response:", body.slice(0, 100));
                resolve(body.includes("Nvidia OK") || body.includes("choices"));
            });
        });
        req.on('error', e => { console.error("Nvidia Error:", e); resolve(false); });
        req.write(data);
        req.end();
    });
}

async function runTests() {
    const mistral = await testMistral();
    const nvidia = await testNvidia();
    console.log(`\nFinal Result: Mistral: ${mistral ? 'PASS' : 'FAIL'}, NVIDIA: ${nvidia ? 'PASS' : 'FAIL'}`);
    process.exit(0);
}

runTests();
