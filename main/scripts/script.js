// Default settings - using shared configuration

// Default settings
const defaultSettings = {
    requestsToday: 0,
    totalRequests: 0,
    questionsUsed: 0,
    isActive: true,
    workMode: 'manual',
    answerDisplayMode: 'dot'
};

console.log('=== SCRIPT.JS LOADED ===');
console.log('Script loaded - browserAPI:', browserAPI, 'isFirefox:', isFirefox, 'isChrome:', isChrome);
console.log('Extension context:', typeof browserAPI !== 'undefined' && browserAPI !== null);

// User identification - using shared functions

// Register user on backend
function registerUserOnBackend() {
    const userId = getUserId();
    
    // Check if user is already registered
    if (hasStorageAPI) {
        browserAPI.storage.sync.get(['userRegistered'], function(regResult) {
            if (regResult.userRegistered) {
                console.log('User already registered, skipping registration');
                return;
            }
            
            // Get current tokens balance from storage
            browserAPI.storage.sync.get(['tokensBalance'], function(result) {
                const currentTokens = result.tokensBalance || TOKEN_CONFIG.initialTokens;
                console.log('Registering NEW user with current tokens:', currentTokens);
                
                const userData = {
                    user_id: userId,
                    user_agent: navigator.userAgent,
                    language: navigator.language,
                    platform: navigator.platform,
                    timestamp: new Date().toISOString(),
                    tokens_balance: currentTokens
                };
                
                // Send registration to backend
                fetch('http://localhost:3000/api/users/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': 'ai_assistant_api_key_2024'
                    },
                    body: JSON.stringify(userData)
                })
                .then(response => response.json())
                .then(data => {
                    console.log('User registered successfully:', data);
                    // Mark user as registered
                    browserAPI.storage.sync.set({ userRegistered: true });
                    // Update local storage with tokens from backend
                    if (data.user && data.user.tokens_balance !== undefined && browserAPI && browserAPI.storage) {
                        browserAPI.storage.sync.set({ tokensBalance: data.user.tokens_balance });
                    }
                })
                .catch(error => {
                    console.log('User registration failed (backend not available):', error);
                });
            });
        });
    } else {
        // Fallback for direct HTML
        const userData = {
            user_id: userId,
            user_agent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            timestamp: new Date().toISOString(),
            tokens_balance: TOKEN_CONFIG.initialTokens
        };
        
        fetch('http://localhost:3000/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'ai_assistant_api_key_2024'
            },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('User registered:', data);
        })
        .catch(error => {
            console.log('User registration failed (backend not available):', error);
        });
    }
}

// API availability checks
const isExtensionContext = typeof browserAPI !== 'undefined' && browserAPI !== null;
const hasStorageAPI = isExtensionContext && browserAPI.storage;
const hasRuntimeAPI = isExtensionContext && browserAPI.runtime;

// Global functions
window.openSubscriptionPage = function() {
    console.log('=== openSubscriptionPage called ===');
    console.log('hasRuntimeAPI:', hasRuntimeAPI);
    console.log('browserAPI:', browserAPI);
    console.log('window.location:', window.location);
    
    try {
    if (!hasRuntimeAPI) {
            console.log('No runtime API, redirecting to subscription.html');
        window.location.href = 'subscription.html';
        return;
    }
    
        console.log('Creating new tab with subscription page');
    browserAPI.tabs.create({
        url: browserAPI.runtime.getURL('subscription.html')
    });
    window.close();
    } catch (error) {
        console.error('Error in openSubscriptionPage:', error);
        // Fallback: try direct redirect
        console.log('Fallback: trying direct redirect');
        window.location.href = 'subscription.html';
    }
};

// Call Gemini API with rotation
async function callGeminiApi(prompt, retryCount = 0) {
    try {
        const apiKey = getCurrentApiKey();
        const response = await fetch(`${GEMINI_CONFIG.apiUrl}/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data;
        } else if (response.status === 403 || response.status === 429) {
            // API key quota exceeded or forbidden, try next key
            if (retryCount < GEMINI_CONFIG.maxRetries) {
                console.log(`API key failed with status ${response.status}, rotating to next key`);
                rotateApiKey();
                return await callGeminiApi(prompt, retryCount + 1);
            } else {
                throw new Error(`All API keys failed. Last status: ${response.status}`);
            }
        } else {
            throw new Error(`API call failed with status: ${response.status}`);
        }
    } catch (error) {
        if (retryCount < GEMINI_CONFIG.maxRetries) {
            console.log(`API call error, rotating to next key:`, error);
            rotateApiKey();
            return await callGeminiApi(prompt, retryCount + 1);
        } else {
            throw error;
        }
    }
}

window.saveSettings = function() {
    if (!hasStorageAPI) {
        showStatusMessage('Розширення не завантажено правильно. Перезавантажте сторінку.', 'error');
        return;
    }
    
    const workModeElement = document.getElementById('workMode');
    const answerDisplayModeElement = document.getElementById('answerDisplayMode');
    const autoDelayElement = document.getElementById('autoDelay');
    
    if (!workModeElement || !answerDisplayModeElement) {
        showStatusMessage('Елементи налаштувань не знайдено!', 'error');
        return;
    }
    
    const settings = {
        workMode: workModeElement.value,
        answerDisplayMode: answerDisplayModeElement.value
    };
    
    // Add auto delay if available
    if (autoDelayElement) {
        settings.autoDelay = parseFloat(autoDelayElement.value);
    }
    
    browserAPI.storage.sync.set(settings, function() {
        showStatusMessage('Налаштування збережено!', 'success');
    });
};

window.resetSettings = function() {
    if (!hasStorageAPI) {
        showStatusMessage('Розширення не завантажено правильно. Перезавантажте сторінку.', 'error');
        return;
    }
    
    browserAPI.storage.sync.clear(function() {
        loadSettings();
        showStatusMessage('Налаштування скинуто!', 'success');
    });
};

window.togglePassword = function(inputId) {
    // This function is no longer needed since we removed API settings
    return;
};

window.updateApiProvider = function() {
    // This function is no longer needed since we only use Google Gemini
    return;
};

window.updateWorkMode = function() {
    const workModeElement = document.getElementById('workMode');
    if (!workModeElement) {
        console.error('workMode element not found');
        return;
    }
    
    const workMode = workModeElement.value;
    const autoMode = document.querySelector('.auto-mode');
    const manualMode = document.querySelector('.manual-mode');
    const clickMode = document.querySelector('.click-mode');
    const disabledMode = document.querySelector('.disabled-mode');
    
    // Hide all modes first
    if (autoMode) autoMode.style.display = 'none';
    if (manualMode) manualMode.style.display = 'none';
    if (clickMode) clickMode.style.display = 'none';
    if (disabledMode) disabledMode.style.display = 'none';
    
    // Show the selected mode
    if (workMode === 'auto') {
        if (autoMode) autoMode.style.display = 'block';
    } else if (workMode === 'manual') {
        if (manualMode) manualMode.style.display = 'block';
    } else if (workMode === 'click') {
        if (clickMode) clickMode.style.display = 'block';
    } else if (workMode === 'disabled') {
        if (disabledMode) disabledMode.style.display = 'block';
    }
    
    if (hasStorageAPI) {
        browserAPI.storage.sync.set({ workMode: workMode });
    }
};

window.updateAnswerDisplayMode = function() {
    const answerDisplayModeElement = document.getElementById('answerDisplayMode');
    if (!answerDisplayModeElement) {
        console.error('answerDisplayMode element not found');
        return;
    }
    
    const answerDisplayMode = answerDisplayModeElement.value;
    
    if (hasStorageAPI) {
        browserAPI.storage.sync.set({ answerDisplayMode: answerDisplayMode });
    }
};

window.updateAutoDelay = function() {
    const autoDelayElement = document.getElementById('autoDelay');
    const delayValueElement = document.getElementById('delayValue');
    
    if (!autoDelayElement || !delayValueElement) {
        console.error('Auto delay elements not found');
        return;
    }
    
    const delay = autoDelayElement.value;
    delayValueElement.textContent = delay + 'с';
    
    if (hasStorageAPI) {
        browserAPI.storage.sync.set({ autoDelay: parseFloat(delay) });
    }
};

window.upgradeAccount = function() {
    openSubscriptionPage();
};

// Load settings
function loadSettings() {
    console.log('=== loadSettings called ===');
    
    if (!hasStorageAPI) {
        // Use default settings when extension is not available
        const workModeElement = document.getElementById('workMode');
        const answerDisplayModeElement = document.getElementById('answerDisplayMode');
        const autoDelayElement = document.getElementById('autoDelay');
        const delayValueElement = document.getElementById('delayValue');
        
        if (workModeElement) workModeElement.value = 'manual'; // Force manual mode for testing
        if (answerDisplayModeElement) answerDisplayModeElement.value = defaultSettings.answerDisplayMode;
        
        // Set default auto delay
        if (autoDelayElement) {
            autoDelayElement.value = 2; // Default 2 seconds
        }
        if (delayValueElement) {
            delayValueElement.textContent = '2с';
        }
        
        updateWorkMode();
        
        // Register user on backend
        registerUserOnBackend();
        console.log('Extension not available, using default settings');
        return;
    }
    
    browserAPI.storage.sync.get(defaultSettings, function(items) {
        if (chrome.runtime.lastError) {
            console.error('Error loading settings:', chrome.runtime.lastError);
            return;
        }
        
        console.log('Settings loaded from storage:', items);
        
        const workModeElement = document.getElementById('workMode');
        const answerDisplayModeElement = document.getElementById('answerDisplayMode');
        const autoDelayElement = document.getElementById('autoDelay');
        const delayValueElement = document.getElementById('delayValue');
        
        if (workModeElement) workModeElement.value = items.workMode || defaultSettings.workMode; // Force manual mode for testing
        if (answerDisplayModeElement) answerDisplayModeElement.value = items.answerDisplayMode || defaultSettings.answerDisplayMode;
        
        // Load auto delay setting
        const autoDelay = items.autoDelay || 2; // Default 2 seconds
        if (autoDelayElement) {
            autoDelayElement.value = autoDelay;
        }
        if (delayValueElement) {
            delayValueElement.textContent = autoDelay + 'с';
        }
        
        updateWorkMode();
        
        // Force save manual mode to storage
        browserAPI.storage.sync.set({ workMode: 'manual' }, function() {
            console.log('Forced manual mode saved to storage');
        });
        
        // Register user on backend
        registerUserOnBackend();
    });
}

// Update stats
function updateStats() {
    console.log('=== updateStats called ===');
    
    if (!hasStorageAPI) {
        // Fallback for when extension is not available (direct HTML file)
        // Update current balance in header
        const currentBalanceElement = document.getElementById('currentBalance');
        if (currentBalanceElement) {
            currentBalanceElement.textContent = TOKEN_CONFIG.initialTokens;
        }
        
        console.log('Extension not available, using fallback stats');
        return;
    }
    
    browserAPI.storage.sync.get(['tokensBalance'], function(items) {
        if (chrome.runtime.lastError) {
            console.error('Error loading stats:', chrome.runtime.lastError);
            return;
        }
        
        const tokensBalance = items.tokensBalance || TOKEN_CONFIG.initialTokens;
        
        console.log('Balance loaded from storage:', tokensBalance);
        
        // Update current balance in header
        const currentBalanceElement = document.getElementById('currentBalance');
        if (currentBalanceElement) {
            currentBalanceElement.textContent = tokensBalance;
        }
        
        console.log('Balance updated in UI');
    });
}

// Update API provider
function updateApiProvider() {
    // This function is no longer needed since we only use Google Gemini
    return;
}

// Update API status
function updateApiStatus() {
    // This function is no longer needed since we only use Google Gemini
        return;
    }
    
// Get plan display name
function getPlanDisplayName(planType) {
    const planNames = {
        student: 'Student',
        premium: 'Premium',
        semester: 'Semester Pack'
    };
    return planNames[planType] || planType;
}

// Show status message
function showStatusMessage(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    if (!statusElement) {
        console.error('statusMessage element not found');
        return;
    }
    
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    console.log('=== setupEventListeners started ===');
    
    const workModeSelect = document.getElementById('workMode');
    workModeSelect.addEventListener('change', function() {
        updateWorkMode();
        setTimeout(saveSettings, 500);
    });
    
    const answerDisplayModeSelect = document.getElementById('answerDisplayMode');
    answerDisplayModeSelect.addEventListener('change', function() {
        updateAnswerDisplayMode();
        setTimeout(saveSettings, 500);
    });
    
    // Add event listener for auto delay slider
    const autoDelaySlider = document.getElementById('autoDelay');
    if (autoDelaySlider) {
        autoDelaySlider.addEventListener('input', function() {
            updateAutoDelay();
        });
        autoDelaySlider.addEventListener('change', function() {
            updateAutoDelay();
            setTimeout(saveSettings, 500);
        });
    }
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', function() {
        saveSettings();
    });
    
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', function() {
        resetSettings();
    });
    
    // Add click handler for replenish button
    const replenishBtn = document.getElementById('replenishBtn');
    if (replenishBtn) {
        replenishBtn.addEventListener('click', function() {
            console.log('Replenish button clicked');
            openSubscriptionPage();
        });
        console.log('Replenish button event listener added');
    } else {
        console.log('Replenish button not found');
    }
    
    // Add click handler for limit text
    const limitText = document.getElementById('limitText');
    console.log('limitText element:', limitText);
    
    if (limitText) {
        console.log('Adding click listener to limitText');
        limitText.addEventListener('click', function() {
            console.log('Limit text clicked, opening subscription page...');
            openSubscriptionPage();
        });
        
        // Додаємо стиль для показу що елемент клікабельний
        limitText.style.cursor = 'pointer';
        limitText.style.color = '#007AFF';
        limitText.style.textDecoration = 'underline';
        
        console.log('Click listener added successfully');
    } else {
        console.error('limitText element not found!');
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded event fired ===');
    console.log('Starting popup initialization...');
    
    loadSettings();
    setupEventListeners();
    updateStats();
    
    // Listen for storage changes to sync data
    if (browserAPI && browserAPI.storage) {
        browserAPI.storage.onChanged.addListener(function(changes, namespace) {
            if (namespace === 'sync' && changes.tokensBalance) {
                updateStats();
            }
        });
    }
    
    // Update stats when window gets focus (user returns from payment page)
    window.addEventListener('focus', function() {
        updateStats();
    });
});
