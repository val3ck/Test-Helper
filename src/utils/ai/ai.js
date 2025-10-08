// Content Script for AI Assistant Extension
// Handles test page interaction and answer selection

// Browser detection
const isFirefox = typeof browser !== 'undefined' && browser.storage;
const isChrome = typeof chrome !== 'undefined' && chrome.storage;
const browserAPI = isFirefox ? browser : (isChrome ? chrome : null);

// console.log('Content script loaded - browserAPI:', browserAPI, 'isFirefox:', isFirefox, 'isChrome:', isChrome);

// Token configuration
const TOKEN_CONFIG = {
    tokensPerQuestion: 1, // 1 токен = 1 питання до ШІ
    initialTokens: 20
};

// Google Gemini configuration with API rotation
const GEMINI_CONFIG = {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeys: [
        'ur apis'
    ],
    currentKeyIndex: 0,
    maxRetries: 3
};

// API rotation functions
function getCurrentApiKey() {
    return GEMINI_CONFIG.apiKeys[GEMINI_CONFIG.currentKeyIndex];
}

function rotateApiKey() {
    GEMINI_CONFIG.currentKeyIndex = (GEMINI_CONFIG.currentKeyIndex + 1) % GEMINI_CONFIG.apiKeys.length;
    console.log(`Rotated to API key index: ${GEMINI_CONFIG.currentKeyIndex}`);
    return getCurrentApiKey();
}

// Call Gemini API with rotation
async function callGeminiApi(prompt, retryCount = 0) {
    try {
        const apiKey = getCurrentApiKey();
        const response = await fetch(`${GEMINI_CONFIG.apiUrl}/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                    parts: [
                        {
                            text: // cheith, idk how this prompt works, it was generated with ai. Don't ask
                            `
                                Got it — I kept that exact ternary unchanged. Here’s the prompt in English:
                                You are given the following question: ${prompt.quest}. You are also given the example answers: ${prompt.answers}. Your task is to give your answer exactly in the same text format as the example answers — copy the same structure, symbols, punctuation, tags, and style used there. Do not explain, do not add or remove anything, just output the answer in the exact same way as in the provided examples. ${prompt.multi == true ? 'If there are several correct answers, write them separated by commas exactly as shown in the examples.' : 'Answer can be only one.'}
                                Additional rules:
                                Select answer(s) only from the string ${prompt.answers}.
                                When deciding which answer(s) are correct, ignore HTML tags (HTML should not affect the decision), but in the output include HTML tags verbatim exactly as they appear in ${prompt.answers}.
                                Output must be exactly one line containing the answer(s) and nothing else: no explanations, no quotes, no comments, no extra whitespace or line breaks.
                                If the ternary above indicates multiple answers, output them in one line separated by commas, preserving the exact characters, order, spaces, case, punctuation, and HTML tags from ${prompt.answers}. If it indicates a single answer, output exactly one from ${prompt.answers}.
                            `
                    }
                   ]
                }]
            })
        });
        if (response.ok) {
            const data = await response.json();
            
            return data.candidates[0].content.parts[0].text;
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
            throw new Error(`API call failed 5with status: ${response.status}`);
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
// catching message
browser.runtime.onMessage.addListener((msg)=>{
    if (msg.type == 'aiAsk'){
        let result = callGeminiApi(msg.data)
        console.log(msg.data)
        result.then(response => {
            console.log(response)
        })
    }
})