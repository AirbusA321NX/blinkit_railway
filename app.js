const sidebar = document.getElementById('sidebar');
const openAssistant = document.getElementById('open-assistant');
const closeSidebar = document.getElementById('close-sidebar');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const imageInput = document.getElementById('image-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImage = document.getElementById('remove-image');

let pendingImageBase64 = null;

// Toggle Sidebar
openAssistant.addEventListener('click', () => {
    sidebar.classList.add('active');
    userInput.focus();
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('active');
});

// Image Handling
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG
                pendingImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
                imagePreview.src = pendingImageBase64;
                imagePreviewContainer.classList.remove('hidden');
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

removeImage.addEventListener('click', () => {
    pendingImageBase64 = null;
    imagePreviewContainer.classList.add('hidden');
    imageInput.value = '';
});

// Messaging
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text && !pendingImageBase64) return;

    // Add user message to UI
    appendMessage('user', text || 'Sent an image');
    if (pendingImageBase64) {
        const img = document.createElement('img');
        img.src = pendingImageBase64;
        img.style.width = '100%';
        img.style.borderRadius = '12px';
        img.style.marginTop = '10px';
        chatHistory.lastElementChild.appendChild(img);
    }

    const currentText = text;
    const currentImage = pendingImageBase64;

    // Clear inputs
    userInput.value = '';
    pendingImageBase64 = null;
    imagePreviewContainer.classList.add('hidden');
    imageInput.value = '';

    // Typing indicator
    const loadingId = addTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: currentText,
                image: currentImage
            })
        });

        const data = await response.json();
        removeTypingIndicator(loadingId);

        if (data.error) {
            appendMessage('assistant', `Error: ${data.error}`);
        } else {
            appendMessage('assistant', data.reply, data.products, data.source);
        }
    } catch (err) {
        removeTypingIndicator(loadingId);
        appendMessage('assistant', "Sorry, I'm having trouble connecting to the server.", [], "Local Fallback");
    }
}

function appendMessage(role, content, products = [], source = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerText = content;
    msgDiv.appendChild(contentDiv);

    if (source && role === 'assistant') {
        const sourceDiv = document.createElement('div');
        sourceDiv.style.fontSize = '0.7rem';
        sourceDiv.style.marginTop = '8px';
        sourceDiv.style.opacity = '0.6';
        sourceDiv.style.fontStyle = 'italic';
        sourceDiv.innerText = `Source: ${source}`;
        msgDiv.appendChild(sourceDiv);
    }

    if (products && products.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'product-grid';
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${p.image || 'https://via.placeholder.com/100'}" alt="${p.name}">
                <h4>${p.name}</h4>
                <div class="price">₹${p.price}</div>
            `;
            grid.appendChild(card);
        });
        msgDiv.appendChild(grid);
    }

    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addTypingIndicator() {
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message assistant';
    div.innerHTML = `
        <div class="typing-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
