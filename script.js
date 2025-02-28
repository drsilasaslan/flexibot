// DOM Elements
const modelSelect = document.querySelector('#model-select');
const refreshModelsBtn = document.querySelector('#refresh-models');
const chatDisplay = document.querySelector('#chat-display');
const userInput = document.querySelector('#user-input');
const sendButton = document.querySelector('#send-button');
const clearButton = document.querySelector('#clear-button');
const apiKeyDialog = document.querySelector('#api-key-dialog');
const apiKeyInput = document.querySelector('#api-key-input');
const okButton = document.querySelector('#ok-button');
const cancelButton = document.querySelector('#cancel-button');
const themeToggle = document.querySelector('#themeToggle');

// Constants
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const LOCAL_STORAGE_API_KEY = 'flexibot_api_key';
const LOCAL_STORAGE_CHAT_HISTORY = 'flexibot_chat_history';
const LOCAL_STORAGE_CHAT_ARCHIVE = 'flexibot_chat_archive';
const LOCAL_STORAGE_DARK_MODE = 'flexibotDarkMode';

// Statische Modellinformationen
const MODEL_INFO = {
    // DeepSeek-Modelle
    'deepseek-r1-distill-llama-70b': {
        category: 'DeepSeek',
        description: 'Hohe Qualität, optimierte Effizienz'
    },
    'deepseek-r1-distill-qwen-32b': {
        category: 'DeepSeek',
        description: 'Effizienz & Leistungsbalance'
    },
    
    // Gemma-Modelle
    'gemma2-9b-it': {
        category: 'Gemma',
        description: 'Mehrsprachig, ressourcenschonend'
    },
    
    // Llama-Modelle
    'llama-3.1-8b-instant': {
        category: 'Llama',
        description: 'Echtzeit-Anwendungen'
    },
    'llama-3.2-11b-vision-preview': {
        category: 'Llama',
        description: 'Bild- und Textverarbeitung'
    },
    'llama-3.2-90b-vision-preview': {
        category: 'Llama',
        description: 'Multimodale Verarbeitung'
    },
    'llama-guard-3-8b': {
        category: 'Llama',
        description: 'Inhaltsmoderation'
    },
    'llama3-70b-8192': {
        category: 'Llama',
        description: 'Code & komplexe Lösungen'
    },
    'llama3-8b-8192': {
        category: 'Llama',
        description: 'Codegenerierung'
    },
    
    // Mixtral-Modelle
    'mixtral-saba-24b': {
        category: 'Mixtral',
        description: 'Textgenerierung'
    },
    'mixtral-8x7b-32768': {
        category: 'Mixtral',
        description: 'Lange Texte & Coding'
    },
    
    // Qwen-Modelle
    'qwen-2.5-32b': {
        category: 'Qwen',
        description: 'Allgemeine Textgenerierung'
    },
    'qwen-2.5-coder-32b': {
        category: 'Qwen',
        description: 'Programmierung'
    }
};

// Variables
let apiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY) || '';
let currentModel = '';
let chatHistory = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CHAT_HISTORY) || '[]');
let chatArchive = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CHAT_ARCHIVE) || '[]');
let isArchiveVisible = false;

// Initialize the application
function init() {
    // DOM-Elemente initialisieren
    const archivePanel = document.querySelector('#archive-panel');
    const archiveList = document.querySelector('#archive-list');
    const newChatButton = document.querySelector('#new-chat-button');
    const archiveToggle = document.querySelector('#archive-toggle');
    
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
            apiKeyDialog.style.display = 'none';
        }
    });
    
    // Model selection
    modelSelect.addEventListener('change', (e) => {
        currentModel = e.target.value;
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Initialize theme
    initTheme();

    // Archive functionality
    newChatButton.addEventListener('click', createNewChat);
    archiveToggle.addEventListener('click', () => toggleArchive(archivePanel, archiveList));
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

// Save chat archive to local storage
function saveArchive() {
    localStorage.setItem(LOCAL_STORAGE_CHAT_ARCHIVE, JSON.stringify(chatArchive));
}

// Create a new chat
function createNewChat() {
    const archivePanel = document.querySelector('#archive-panel');
    
    // Archiviere den aktuellen Chat, wenn er nicht leer ist
    if (chatHistory.length > 0) {
        const timestamp = new Date().toISOString();
        const firstMessage = chatHistory[0]?.content || "Neuer Chat";
        const preview = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? "..." : "");
        
        chatArchive.unshift({
            id: Date.now(),
            timestamp: timestamp,
            preview: preview,
            messages: [...chatHistory]
        });
        
        saveArchive();
    }
    
    // Leere den aktuellen Chat
    chatHistory = [];
    saveHistory();
    chatDisplay.innerHTML = '';
    
    // Schließe das Archiv, wenn es geöffnet ist
    if (isArchiveVisible) {
        isArchiveVisible = false;
        archivePanel.style.display = 'none';
    }
}

// Toggle archive visibility
function toggleArchive(archivePanel, archiveList) {
    isArchiveVisible = !isArchiveVisible;
    
    if (isArchiveVisible) {
        // Zeige das Archiv an
        archivePanel.style.display = 'block';
        updateArchiveList(archiveList);
    } else {
        // Verstecke das Archiv
        archivePanel.style.display = 'none';
    }
}

// Load an archived chat
function loadArchivedChat(index) {
    const archivePanel = document.querySelector('#archive-panel');
    
    if (index >= 0 && index < chatArchive.length) {
        // Archiviere den aktuellen Chat, wenn er nicht leer ist
        if (chatHistory.length > 0) {
            const timestamp = new Date().toISOString();
            const firstMessage = chatHistory[0]?.content || "Neuer Chat";
            const preview = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? "..." : "");
            
            chatArchive.unshift({
                id: Date.now(),
                timestamp: timestamp,
                preview: preview,
                messages: [...chatHistory]
            });
        }
        
        // Lade den ausgewählten Chat
        const selectedChat = chatArchive[index];
        chatHistory = [...selectedChat.messages];
        
        // Entferne den geladenen Chat aus dem Archiv
        chatArchive.splice(index, 1);
        
        // Speichere Änderungen
        saveHistory();
        saveArchive();
        
        // Zeige den geladenen Chat an
        displayChatHistory();
        
        // Schließe das Archiv
        isArchiveVisible = false;
        archivePanel.style.display = 'none';
    }
}

// Delete an archived chat
function deleteArchivedChat(index) {
    const archiveList = document.querySelector('#archive-list');
    
    if (confirm('Möchten Sie diesen archivierten Chat wirklich löschen?')) {
        chatArchive.splice(index, 1);
        saveArchive();
        updateArchiveList(archiveList);
    }
}

// Update the archive list
function updateArchiveList(archiveList) {
    archiveList.innerHTML = '';
    
    if (chatArchive.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'archive-item empty';
        emptyItem.textContent = 'Keine archivierten Chats vorhanden';
        archiveList.appendChild(emptyItem);
        return;
    }
    
    chatArchive.forEach((chat, index) => {
        const item = document.createElement('div');
        item.className = 'archive-item';
        
        const date = new Date(chat.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        item.innerHTML = `
            <div class="archive-item-header">
                <span class="archive-item-date">${formattedDate}</span>
                <button class="archive-delete-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="archive-item-preview">${chat.preview}</div>
        `;
        
        item.addEventListener('click', (e) => {
            // Ignoriere Klicks auf den Löschen-Button
            if (e.target.closest('.archive-delete-btn')) return;
            
            loadArchivedChat(index);
        });
        
        archiveList.appendChild(item);
    });
    
    // Event-Listener für Löschen-Buttons
    document.querySelectorAll('.archive-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            deleteArchivedChat(index);
        });
    });
}

// Clear chat history
function clearChat() {
    if (confirm('Möchten Sie den Chat-Verlauf wirklich löschen?')) {
        chatHistory = [];
        saveHistory();
        chatDisplay.innerHTML = '';
    }
}

// Theme toggle functionality
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem(LOCAL_STORAGE_DARK_MODE, isDarkMode);
    
    // Select-Element für Dark Mode anpassen
    const modelSelect = document.getElementById('model-select');
    if (isDarkMode) {
        modelSelect.classList.add('dark-select');
        // Inline-Styles für bessere Browser-Kompatibilität
        modelSelect.style.backgroundColor = '#333';
        modelSelect.style.color = 'white';
        
        // Alle Optionen direkt stylen
        const options = modelSelect.querySelectorAll('option');
        options.forEach(option => {
            option.style.backgroundColor = '#333';
            option.style.color = 'white';
        });
    } else {
        modelSelect.classList.remove('dark-select');
        modelSelect.style.backgroundColor = '';
        modelSelect.style.color = '';
        
        // Styles zurücksetzen
        const options = modelSelect.querySelectorAll('option');
        options.forEach(option => {
            option.style.backgroundColor = '';
            option.style.color = '';
        });
    }
}

// Initialize theme
function initTheme() {
    const isDarkMode = localStorage.getItem(LOCAL_STORAGE_DARK_MODE) === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        const modelSelect = document.getElementById('model-select');
        modelSelect.classList.add('dark-select');
        
        // Inline-Styles für bessere Browser-Kompatibilität
        modelSelect.style.backgroundColor = '#333';
        modelSelect.style.color = 'white';
        
        // Alle Optionen direkt stylen
        const options = modelSelect.querySelectorAll('option');
        options.forEach(option => {
            option.style.backgroundColor = '#333';
            option.style.color = 'white';
        });
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
