// Shared configuration and utilities for AI Assistant Extension

// Browser detection
const isFirefox = typeof browser !== 'undefined' && browser.storage;
const isChrome = typeof chrome !== 'undefined' && chrome.storage;
const browserAPI = isFirefox ? browser : (isChrome ? chrome : null);

// Token configuration
const TOKEN_CONFIG = {
    tokensPerQuestion: 1, // 1 токен = 1 питання до ШІ
    initialTokens: 20
};

// Google Gemini configuration with API rotation (encoded)
const GEMINI_CONFIG = {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeys: [
        'QUl6YVN5QnBJMjRZb1pKOS1hX29XMHlnc2xyMUc4SGprR1JxaDg=',
        'QUl6YVN5QzlGX25qVVVrb3A5UnVwcWEwRlhDYnNCMzJMTUpBMjQ0',
        'QUl6YVN5RG9SXzg0MUJ4eF9XWGRsNmloeTlBeEUycFA2Q1RfQmpz',
        'QUl6YVN5RG9KUWs1OW4tSUR6alFNR2R3MG1rYURtd2ZhbnJnM1Yw',
        'QUl6YVN5QjVUeFFwc1Rpc3NNcmdKam01Nm1XQUNWUG5RMlQyVllZ',
        'QUl6YVN5RDRLdC11QlV5R3VKTDE3cUxUTUk1YXpwZHhfdnZvaFRr'
    ],
    currentKeyIndex: 0,
    maxRetries: 3
};

// Decode function for API keys
function decodeApiKey(encodedKey) {
    try {
        return atob(encodedKey);
    } catch (error) {
        console.error('Failed to decode API key:', error);
        return null;
    }
}

// Friend code configuration
const FRIEND_CODE_CONFIG = {
    specialTokens: 500,
    maxUses: 1,
    validCodes: [
        'FRIENDS500', 'VIP500', 'SPECIAL500', 'BONUS500', 'GIFT500',
        'TEAM500', 'CREW500', 'SQUAD500', 'GROUP500', 'CLAN500',
        'ELITE500', 'PRO500', 'MASTER500', 'BOSS500', 'KING500',
        'LEGEND500', 'HERO500', 'STAR500', 'GOLD500', 'DIAMOND500'
    ]
};

// API rotation functions
function getCurrentApiKey() {
    const encodedKey = GEMINI_CONFIG.apiKeys[GEMINI_CONFIG.currentKeyIndex];
    return decodeApiKey(encodedKey);
}

function rotateApiKey() {
    GEMINI_CONFIG.currentKeyIndex = (GEMINI_CONFIG.currentKeyIndex + 1) % GEMINI_CONFIG.apiKeys.length;
    console.log(`Rotated to API key index: ${GEMINI_CONFIG.currentKeyIndex}`);
    return getCurrentApiKey();
}

// User identification
function getUserId() {
    let userId = localStorage.getItem('ai_assistant_user_id');
    if (!userId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        userId = `user_${timestamp}_${random}`;
        localStorage.setItem('ai_assistant_user_id', userId);
        console.log('Generated new user ID:', userId);
    }
    return userId;
}

// Call Gemini API with rotation
async function callGeminiApi(prompt, retryCount = 0) {
    try {
        const apiKey = getCurrentApiKey();
        console.log(`Trying API key ${GEMINI_CONFIG.currentKeyIndex + 1}/${GEMINI_CONFIG.apiKeys.length} (attempt ${retryCount + 1})`);
        
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
            console.log(`✅ API call successful with key ${GEMINI_CONFIG.currentKeyIndex + 1}`);
            return data.candidates[0].content.parts[0].text;
        } else if (response.status === 403 || response.status === 429) {
            console.log(`❌ API key ${GEMINI_CONFIG.currentKeyIndex + 1} failed with status ${response.status}`);
            
            // Check if we've tried all keys
            if (retryCount >= GEMINI_CONFIG.apiKeys.length - 1) {
                console.log('❌ All API keys exhausted');
                throw new Error('All API keys exhausted');
            }
            
            rotateApiKey();
            return await callGeminiApi(prompt, retryCount + 1);
        } else {
            throw new Error(`API call failed with status: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ API call error:`, error);
        
        // Check if we've tried all keys
        if (retryCount >= GEMINI_CONFIG.apiKeys.length - 1) {
            console.log('❌ All API keys exhausted due to error');
            throw error;
        }
        
        rotateApiKey();
        return await callGeminiApi(prompt, retryCount + 1);
    }
}

// Enhanced AI prompt
async function callGeminiApiEnhanced(question, answers, multi = false, retryCount = 0) {
    try {
        const apiKey = getCurrentApiKey();
        const prompt = {
            quest: question,
            answers: answers,
            multi: multi
        };
        
        console.log(`Trying API key ${GEMINI_CONFIG.currentKeyIndex + 1}/${GEMINI_CONFIG.apiKeys.length} (attempt ${retryCount + 1})`);
        
        const response = await fetch(`${GEMINI_CONFIG.apiUrl}/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `
                        You are given the following question: ${prompt.quest}.
                        You are given the example answers: ${prompt.answers}.
                        ${prompt.multi ? 'This is a MULTIPLE CHOICE question - you can select MORE THAN ONE correct answer.' : 'This is a SINGLE CHOICE question - you must select EXACTLY ONE correct answer.'}
                        
                        IMPORTANT RULES:
                        - ${prompt.multi ? 'Select ALL correct answers from the options' : 'Select ONLY ONE correct answer from the options'}
                        - Copy the EXACT text format from the example answers
                        - Include HTML tags exactly as they appear
                        - Do NOT add explanations, quotes, or extra text
                        - Output must be exactly one line
                        ${prompt.multi ? '- If multiple answers are correct, separate them with commas' : '- Choose only the single best answer'}
                        
                        Select answer(s) only from: ${prompt.answers}
                        `
                    }]
                }]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ API call successful with key ${GEMINI_CONFIG.currentKeyIndex + 1}`);
            return data.candidates[0].content.parts[0].text;
        } else if (response.status === 403 || response.status === 429) {
            console.log(`❌ API key ${GEMINI_CONFIG.currentKeyIndex + 1} failed with status ${response.status}`);
            
            // Check if we've tried all keys
            if (retryCount >= GEMINI_CONFIG.apiKeys.length - 1) {
                console.log('❌ All API keys exhausted');
                throw new Error('All API keys exhausted');
            }
            
            // Add delay before trying next key
            console.log(`⏳ Waiting 2 seconds before trying next key...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            rotateApiKey();
            return await callGeminiApiEnhanced(question, answers, multi, retryCount + 1);
        } else {
            console.log(`❌ API call failed with status: ${response.status}`);
            throw new Error(`API call failed with status: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ API call error:`, error);
        
        // Check if we've tried all keys
        if (retryCount >= GEMINI_CONFIG.apiKeys.length - 1) {
            console.log('❌ All API keys exhausted due to error');
            throw error;
        }
        
        // Add delay before trying next key
        console.log(`⏳ Waiting 2 seconds before trying next key after error...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        rotateApiKey();
        return await callGeminiApiEnhanced(question, answers, multi, retryCount + 1);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isFirefox,
        isChrome,
        browserAPI,
        TOKEN_CONFIG,
        GEMINI_CONFIG,
        FRIEND_CODE_CONFIG,
        getCurrentApiKey,
        rotateApiKey,
        getUserId,
        callGeminiApi,
        callGeminiApiEnhanced
    };
}
