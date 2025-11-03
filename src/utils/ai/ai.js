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
        'AIzaSyBWACM2qPWa9ax46igO8VfEvSnhJwodb8',
        'AIzaSyC8sSuk3xtJkT5XWfPT5V8iI33ivRmwTTk',
        'AIzaSyA3EgkMcJ1bgH7X9Iv_rtUE156FbkYzycE',
        
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
        let { version_proposed: version } = await browser.storage.local.get("version_proposed")
        let { topicForAI: user_input } = await browser.storage.local.get("topicForAI")
        console.log(user_input)
        const response = await fetch(`${GEMINI_CONFIG.apiUrl}/models/gemini-2.5-${(version)?version:'pro'}:generateContent?key=${apiKey}`, {
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
                            ${user_input ? `This question may belong to the topic: ${user_input}. If it does not match, ignore this hint.` : ''}

                            You are given the following question: ${prompt.quest}.
                            ${prompt.testType !== 'input' ? `You are given the example answers: ${prompt.answers}.` : ''}

                            ${prompt.testType === 'radioblock'
                            ? 'This task has exactly one correct answer — only one of the provided options is correct. You must output exactly one answer, no more and no less.'
                            : prompt.testType === 'checkbox'
                            ? 'This task may have several correct answers — output all correct answers separated by commas, keeping the same HTML structure, tags, and punctuation.'
                            : 'This task requires writing your own short text answer — no options are provided.'}

                            Your response must:
                            - Contain **only** the answer(s), nothing else (no explanations, no quotes, no line breaks, no commentary).
                            - Copy the **exact format**, **HTML tags**, and **symbols** used in ${prompt.answers}.
                            - When deciding which answer(s) are correct, ignore HTML tags (they don’t affect correctness).
                            - Always preserve the **original tags** (<p>, <strong>, etc.) in the final output.
                            - Output must be a **single line**.

                            ${prompt.testType === 'radioblock'
                            ? 'Important: output exactly ONE of the provided answers, even if multiple seem correct.'
                            : prompt.testType === 'checkbox'
                            ? 'Important: output ALL correct answers if there are multiple, joined by commas.'
                            : ''}
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
browser.runtime.onMessage.addListener((msg,sender,msgReponse)=>{
    if (msg.type == 'aiAsk'){
        console.log(msg.data)
        callGeminiApi(msg.data)
        .then(result=>{
            browser.runtime.sendMessage({type:'processAiAnswer',data:{multi:msg.data.type,reply:result}})
            console.log('Answer:',result)
        })
        
    }
})