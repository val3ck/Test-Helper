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
                            ${user_input ? `This question can belong to the topic: ${user_input}. Else If it's not matches with question, then just ignore it.` : ''}
                            You are given the following question: ${prompt.quest}.
                            ${prompt.type !== 'input' ? `You are given the example answers: ${prompt.answers}.` : '' }
                            ${prompt.type === 'checkbox' ? 'This task may have multiple correct answers (multiple possible).' : prompt.type === 'radioblock' ? 'This task has exactly one correct answer (100% 1 option).' : prompt.type === 'input' ? 'This task requires writing the answer (no options are given).' : '' }
                            Your task is to give your answer exactly in the same text format as the example answers — copy the same structure, symbols, punctuation, tags, and style used there. Do not explain, do not add or remove anything; just output the answer in the exact same way as in the provided examples. ${prompt.type !== 'input' ? `Select answer(s) only from the string ${prompt.answers}.` : '' } When deciding which answer(s) are correct, ignore HTML tags (HTML should not affect the decision), but in the output include HTML tags exactly as they appear in ${prompt.answers}. Output must be exactly one line containing the answer(s) and nothing else — no explanations, no quotes, no comments, no extra whitespace or line breaks. If multiple answers are required, list them in one line separated by commas, preserving the exact characters, order, spaces, case, punctuation, and HTML tags from ${prompt.answers}. If only one answer is required, output exactly one single answer${prompt.type !== 'input' ? ' from ${prompt.answers}' : ''}.
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