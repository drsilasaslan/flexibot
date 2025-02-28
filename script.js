// DOM Elements
const modelSelect = document.getElementById('model-select');
const refreshModelsBtn = document.getElementById('refresh-models');
const chatDisplay = document.getElementById('chat-display');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const apiKeyDialog = document.getElementById('api-key-dialog');
const apiKeyInput = document.getElementById('api-key-input');
const okButton = document.getElementById('ok-button');
const cancelButton = document.getElementById('cancel-button');

// Constants
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const LOCAL_STORAGE_API_KEY = 'flexibot_api_key';
const LOCAL_STORAGE_CHAT_HISTORY = 'flexibot_chat_history';

// Statische Modellinformationen
const MODEL_INFO = {
    // DeepSeek-Modelle
    'deepseek-r1-distill-llama-70b': {
        category: 'DeepSeek',
        description: 'Allgemeine Textgenerierung mit hoher Qualität, destillierte Version für bessere Effizienz'
    },
    'deepseek-r1-distill-qwen-32b': {
        category: 'DeepSeek',
        description: 'Effiziente Textverarbeitung mit gutem Kompromiss zwischen Leistung und Ressourcenbedarf'
    },
    
    // Gemma-Modelle
    'gemma2-9b-it': {
        category: 'Gemma',
        description: 'Mehrsprachige Konversationen, gut für mobile Anwendungen und ressourcenschonende Implementierungen'
    },
    
    // Llama-Modelle
    'llama-3.1-8b-instant': {
        category: 'Llama',
        description: 'Schnelle Antworten, ideal für Echtzeit-Anwendungen'
    },
    'llama-3.2-11b-vision-preview': {
        category: 'Llama',
        description: 'Bild- und Textverarbeitung, multimodale Anwendungen'
    },
    'llama-3.2-90b-vision-preview': {
        category: 'Llama',
        description: 'Fortgeschrittene multimodale Verarbeitung mit großem Kontextverständnis'
    },
    'llama-guard-3-8b': {
        category: 'Llama',
        description: 'Inhaltsmoderation und Sicherheitsfilterung'
    },
    'llama3-70b-8192': {
        category: 'Llama',
        description: 'Codegenerierung und komplexe Problemlösungen'
    },
    'llama3-8b-8192': {
        category: 'Llama',
        description: 'Codegenerierung und komplexe Problemlösungen (kleinere Version)'
    },
    
    // Mixtral-Modelle
    'mixtral-saba-24b': {
        category: 'Mixtral',
        description: 'Ausgewogene Textgenerierung mit gutem Verständnis komplexer Zusammenhänge'
    },
    'mixtral-8x7b-32768': {
        category: 'Mixtral',
        description: 'Verarbeitung längerer Texte, technische Dokumentation und Coding-Unterstützung'
    },
    
    // Qwen-Modelle
    'qwen-2.5-32b': {
        category: 'Qwen',
        description: 'Allgemeine Textgenerierung mit gutem Kontextverständnis'
    },
    'qwen-2.5-coder-32b': {
        category: 'Qwen',
        description: 'Spezialisiert auf Programmierung und Code-Generierung'
    }
};

// Variables
let apiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY) || '';
let currentModel = '';
let chatHistory = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CHAT_HISTORY) || '[]');

// Initialize the application
function init() {
    // Check if API key exists
    if (!apiKey) {
        showApiKeyDialog();
    } else {
        loadModels();
    }

    // Load chat history
    displayChatHistory();

    // Event listeners
    refreshModelsBtn.addEventListener('click', loadModels);
    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearChat);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // API Key Dialog
    okButton.addEventListener('click', saveApiKey);
    cancelButton.addEventListener('click', () => {
        if (!apiKey) {
            alert('Ein API-Schlüssel ist erforderlich, um FlexiBot zu nutzen.');
        } else {
            apiKeyDialog.classList.remove('active');
        }
    });

    // Model selection
    modelSelect.addEventListener('change', (e) => {
        currentModel = e.target.value;
    });
}

// Show API Key Dialog
function showApiKeyDialog() {
    apiKeyDialog.classList.add('active');
    apiKeyInput.value = apiKey;
    apiKeyInput.focus();
}

// Save API Key
function saveApiKey() {
    const newApiKey = apiKeyInput.value.trim();
    if (newApiKey) {
        apiKey = newApiKey;
        localStorage.setItem(LOCAL_STORAGE_API_KEY, apiKey);
        apiKeyDialog.classList.remove('active');
        loadModels();
    } else {
        alert('Bitte geben Sie einen gültigen API-Schlüssel ein.');
    }
}

// Load available models from Groq API
async function loadModels() {
    if (!apiKey) {
        showApiKeyDialog();
        return;
    }

    try {
        modelSelect.disabled = true;
        modelSelect.innerHTML = '<option value="">Modelle werden geladen...</option>';
        refreshModelsBtn.disabled = true;
        
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        refreshModelsBtn.appendChild(spinner);

        const response = await fetch(`${GROQ_BASE_URL}/models`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const apiModels = data.data
            .filter(model => !model.id.toLowerCase().includes('whisper'))
            .sort((a, b) => a.id.localeCompare(b.id));

        // Modelle mit statischen Infos kombinieren
        const enhancedModels = apiModels.map(model => ({
            ...model,
            ...(MODEL_INFO[model.id] || {
                category: 'Andere',
                description: 'Allgemeines Sprachmodell'
            })
        }));

        // Nach Kategorien gruppieren
        const groupedModels = enhancedModels.reduce((acc, model) => {
            acc[model.category] = acc[model.category] || [];
            acc[model.category].push(model);
            return acc;
        }, {});

        // Remove spinner
        refreshModelsBtn.removeChild(spinner);
        refreshModelsBtn.disabled = false;

        // Dropdown neu aufbauen
        modelSelect.innerHTML = '';
        Object.entries(groupedModels).forEach(([category, models]) => {
            const group = document.createElement('optgroup');
            group.label = `${category} Modelle`;
            
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = `${model.id} - ${model.description}`;
                option.title = model.description;
                group.appendChild(option);
            });
            
            modelSelect.appendChild(group);
        });
        
        modelSelect.disabled = false;
    } catch (error) {
        console.error('Fehler beim Laden der Modelle:', error);
        alert(`Fehler beim Laden der Modelle: ${error.message}`);
        
        // Remove spinner if exists
        const spinner = refreshModelsBtn.querySelector('.spinner');
        if (spinner) refreshModelsBtn.removeChild(spinner);
        
        refreshModelsBtn.disabled = false;
        modelSelect.innerHTML = '<option value="">Fehler beim Laden</option>';
        modelSelect.disabled = false;
    }
}

// Display chat history
function displayChatHistory() {
    chatDisplay.innerHTML = '';
    chatHistory.forEach(message => {
        addMessageToDisplay(message.role, message.content);
    });
    scrollToBottom();
}

// Add a message to the chat display
function addMessageToDisplay(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;
    
    // Markdown zu HTML konvertieren
    const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(?!\*)(.*?)\*/g, '<em>$1</em>')
        .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');

    messageDiv.innerHTML = formattedContent;
    
    chatDisplay.appendChild(messageDiv);
    scrollToBottom();
}

// Scroll chat to bottom
function scrollToBottom() {
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Send message to the API
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    if (!apiKey) {
        showApiKeyDialog();
        return;
    }
    
    if (!currentModel) {
        alert('Bitte wählen Sie ein Modell aus.');
        return;
    }
    
    // Add user message to chat
    addMessageToDisplay('user', message);
    
    // Add to chat history
    chatHistory.push({ role: 'user', content: message });
    saveHistory();
    
    // Clear input
    userInput.value = '';
    
    // Disable input while waiting for response
    userInput.disabled = true;
    sendButton.disabled = true;
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.innerHTML = 'Denke nach <span class="spinner"></span>';
    chatDisplay.appendChild(loadingDiv);
    scrollToBottom();
    
    try {
        const messages = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
        
        const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentModel,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const botResponse = data.choices[0].message.content;
        
        // Remove loading indicator
        chatDisplay.removeChild(loadingDiv);
        
        // Add bot response to chat
        addMessageToDisplay('bot', botResponse);
        
        // Add to chat history
        chatHistory.push({ role: 'bot', content: botResponse });
        saveHistory();
    } catch (error) {
        console.error('Fehler bei der Chat-Anfrage:', error);
        
        // Remove loading indicator
        chatDisplay.removeChild(loadingDiv);
        
        // Add error message
        addMessageToDisplay('bot', `Fehler bei der Verarbeitung: ${error.message}`);
    } finally {
        // Re-enable input
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Save chat history to local storage
function saveHistory() {
    localStorage.setItem(LOCAL_STORAGE_CHAT_HISTORY, JSON.stringify(chatHistory));
}

// Clear chat history
function clearChat() {
    if (confirm('Möchten Sie den Chat-Verlauf wirklich löschen?')) {
        chatHistory = [];
        saveHistory();
        chatDisplay.innerHTML = '';
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
