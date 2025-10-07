// Default settings
const defaultSettings = {
    requestsToday: 0,
    totalRequests: 0,
    questionsUsed: 0,
    isActive: true,
    workMode: 'hidden',
    answerDisplayMode: 'dot'
};

// Google Gemini configuration with API rotation
const GEMINI_CONFIG = {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    features: ['Швидкі відповіді', 'Розумне розуміння', 'Багатомовність'],
    apiKeys: [
        'AIzaSyBpI24YoZJ9-a_oW0ygslr1G8HhjkGRqh8',
        'AIzaSyC9F_njUUkop9Rupqa0FXCasbQ37LMJ044',
        'AIzaSyDoR_841Bxx_WXdl6ihy9AxE2pQ6CT_Bjs',
        'AIzaSyDoJQk59n-IDzjQMgdw0mkaDmwfanrg3V0',
        'AIzaSyB5DxQpsTissMrgJjm56mWACVPnQ2T2VQY',
        'AIzaSyD4Kt-uBUyGuJL17qLTMI5azpdx_yvohTk'
    ],
    currentKeyIndex: 0,
    maxRetries: 3
};

// Questions configuration
const QUESTIONS_CONFIG = {
    maxRequests: 20,
    requestsPerDay: 20
};

// Token configuration
const TOKEN_CONFIG = {
    tokensPerQuestion: 1, // 1 токен = 1 питання до ШІ
    initialTokens: 20
};

// Browser detection
const isFirefox = typeof browser !== 'undefined' && browser.storage;
const isChrome = typeof chrome !== 'undefined' && chrome.storage;
const browserAPI = isFirefox ? browser : (isChrome ? chrome : null);

console.log('Script loaded - browserAPI:', browserAPI, 'isFirefox:', isFirefox, 'isChrome:', isChrome);
console.log('Extension context:', typeof browserAPI !== 'undefined' && browserAPI !== null);

// API rotation functions
function getCurrentApiKey() {
    return GEMINI_CONFIG.apiKeys[GEMINI_CONFIG.currentKeyIndex];
}

function rotateApiKey() {
    GEMINI_CONFIG.currentKeyIndex = (GEMINI_CONFIG.currentKeyIndex + 1) % GEMINI_CONFIG.apiKeys.length;
    console.log(`Rotated to API key index: ${GEMINI_CONFIG.currentKeyIndex}`);
    return getCurrentApiKey();
}

function resetApiKeyRotation() {
    GEMINI_CONFIG.currentKeyIndex = 0;
    console.log('Reset API key rotation to first key');
}

async function testApiKey(apiKey) {
    try {
        const response = await fetch(`${GEMINI_CONFIG.apiUrl}/models?key=${apiKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            return true;
        } else {
            console.log(`API key test failed with status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`API key test error:`, error);
        return false;
    }
}

async function findWorkingApiKey() {
    const startIndex = GEMINI_CONFIG.currentKeyIndex;
    let attempts = 0;
    
    while (attempts < GEMINI_CONFIG.apiKeys.length) {
        const apiKey = getCurrentApiKey();
        console.log(`Testing API key ${GEMINI_CONFIG.currentKeyIndex + 1}/${GEMINI_CONFIG.apiKeys.length}`);
        
        if (await testApiKey(apiKey)) {
            console.log(`Found working API key at index: ${GEMINI_CONFIG.currentKeyIndex}`);
            return apiKey;
        }
        
        rotateApiKey();
        attempts++;
    }
    
    // If no working key found, reset to first key
    resetApiKeyRotation();
    console.log('No working API key found, reset to first key');
    return getCurrentApiKey();
}

// User identification
function generateUserId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}_${random}`;
}

function getUserId() {
    let userId = localStorage.getItem('ai_assistant_user_id');
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem('ai_assistant_user_id', userId);
        console.log('Generated new user ID:', userId);
    }
    return userId;
}

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
    if (!hasRuntimeAPI) {
        window.location.href = 'subscription.html';
        return;
    }
    
    browserAPI.tabs.create({
        url: browserAPI.runtime.getURL('subscription.html')
    });
    window.close();
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
    
    const settings = {
        workMode: document.getElementById('workMode').value,
        answerDisplayMode: document.getElementById('answerDisplayMode').value
    };
    
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
    const workMode = document.getElementById('workMode').value;
    const hiddenMode = document.querySelector('.hidden-mode');
    const manualMode = document.querySelector('.manual-mode');
    
    if (workMode === 'hidden') {
        hiddenMode.style.display = 'block';
        manualMode.style.display = 'none';
    } else {
        hiddenMode.style.display = 'none';
        manualMode.style.display = 'block';
    }
    
    if (hasStorageAPI) {
        browserAPI.storage.sync.set({ workMode: workMode });
    }
};

window.updateAnswerDisplayMode = function() {
    const answerDisplayMode = document.getElementById('answerDisplayMode').value;
    
    if (hasStorageAPI) {
        browserAPI.storage.sync.set({ answerDisplayMode: answerDisplayMode });
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
        document.getElementById('workMode').value = defaultSettings.workMode;
        document.getElementById('answerDisplayMode').value = defaultSettings.answerDisplayMode;
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
        
        document.getElementById('workMode').value = items.workMode || defaultSettings.workMode;
        document.getElementById('answerDisplayMode').value = items.answerDisplayMode || defaultSettings.answerDisplayMode;
        updateWorkMode();
        
        // Register user on backend
        registerUserOnBackend();
    });
}

// Update stats
function updateStats() {
    console.log('=== updateStats called ===');
    
    if (!hasStorageAPI) {
        // Fallback for when extension is not available (direct HTML file)
        document.getElementById('requestsToday').textContent = '0';
        document.getElementById('totalRequests').textContent = '0';
        document.getElementById('limitUsed').textContent = `${TOKEN_CONFIG.initialTokens}`;
        console.log('Extension not available, using fallback stats');
        return;
    }
    
    browserAPI.storage.sync.get(['requestsToday', 'totalRequests', 'tokensBalance'], function(items) {
        if (chrome.runtime.lastError) {
            console.error('Error loading stats:', chrome.runtime.lastError);
            return;
        }
        
        const requestsToday = items.requestsToday || 0;
        const totalRequests = items.totalRequests || 0;
        const tokensBalance = items.tokensBalance || TOKEN_CONFIG.initialTokens;
        
        console.log('Stats loaded from storage:');
        console.log('- requestsToday:', requestsToday);
        console.log('- totalRequests:', totalRequests);
        console.log('- tokensBalance:', tokensBalance);
        
        document.getElementById('requestsToday').textContent = requestsToday;
        document.getElementById('totalRequests').textContent = totalRequests;
        document.getElementById('limitUsed').textContent = `${tokensBalance}`;
        
        console.log('Stats updated in UI');
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
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
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
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', function() {
        saveSettings();
    });
    
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', function() {
        resetSettings();
    });
    
    // Add click handler for limit text
    const limitText = document.getElementById('limitText');
    if (limitText) {
        limitText.addEventListener('click', function() {
            openSubscriptionPage();
        });
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
    updateStats();
    
    // Initialize API rotation
    initializeApiRotation();
    
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

// Initialize API rotation
async function initializeApiRotation() {
    console.log('Initializing API rotation...');
    try {
        const workingKey = await findWorkingApiKey();
        console.log(`API rotation initialized. Using key index: ${GEMINI_CONFIG.currentKeyIndex}`);
    } catch (error) {
        console.log('API rotation initialization failed:', error);
    }
}
