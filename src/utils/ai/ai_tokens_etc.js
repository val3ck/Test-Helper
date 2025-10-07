

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

// Check if we're on a test page
function isTestPage() {
    const testIndicators = ['тест', 'test', 'quiz', 'вікторина', 'опитування', 'question', 'питання'];
    const pageText = document.body.textContent.toLowerCase();
    const pageTitle = document.title.toLowerCase();
    const pageUrl = window.location.href.toLowerCase();
    
    return testIndicators.some(indicator => 
        pageText.includes(indicator) || pageTitle.includes(indicator) || pageUrl.includes(indicator)
    );
}

// Get work mode from storage
function getWorkMode(callback) {
    if (browserAPI && browserAPI.storage) {
        browserAPI.storage.sync.get(['workMode'], function(result) {
            callback(result.workMode || 'hidden');
        });
    } else {
        callback('hidden');
    }
}

// Get answer display mode from storage
function getAnswerDisplayMode(callback) {
    if (browserAPI && browserAPI.storage) {
        browserAPI.storage.sync.get(['answerDisplayMode'], function(result) {
            callback(result.answerDisplayMode || 'dot');
        });
    } else {
        callback('dot');
    }
}

// Find the first paragraph (question)
function findFirstParagraph() {
    const paragraphs = document.querySelectorAll('p');
    if (paragraphs.length > 0) {
        return paragraphs[0];
    }
    
    const questionSelectors = ['.question', '.question-text', '.quiz-question', '[data-question]'];
    for (const selector of questionSelectors) {
        const element = document.querySelector(selector);
        if (element) return element;
    }
    
    return null;
}

// Find answer options
function findAnswerOptions() {
    const optionSelectors = [
        'input[type="radio"]',
        'input[type="checkbox"]',
        '.option',
        '.answer-option',
        '.choice',
        'label[for*="answer"]',
        'label[for*="option"]'
    ];
    
    const options = [];
    optionSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (!options.includes(element)) {
                options.push(element);
            }
        });
    });
    
    return options;
}

// Click on the first answer option
function clickCorrectAnswer() {
    const options = findAnswerOptions();
    if (options.length > 0) {
        const firstOption = options[0];
        
        if (firstOption.tagName === 'INPUT') {
            firstOption.click();
        } else if (firstOption.tagName === 'LABEL') {
            const input = document.querySelector(`input[id="${firstOption.getAttribute('for')}"]`);
            if (input) {
                input.click();
            } else {
                firstOption.click();
            }
        } else {
            firstOption.click();
        }
        
        return true;
    }
    return false;
}

// Highlight correct answers
function highlightCorrectAnswers() {
    const options = findAnswerOptions();
    if (options.length > 0) {
        const firstOption = options[0];
        
        getAnswerDisplayMode(function(displayMode) {
            switch(displayMode) {
                case 'dot':
                    addDotIndicator(firstOption);
                    break;
                case 'color':
                    addColorIndicator(firstOption);
                    break;
                case 'highlight':
                    addHighlightIndicator(firstOption);
                    break;
                case 'border':
                    addBorderIndicator(firstOption);
                    break;
                default:
                    addDotIndicator(firstOption);
            }
        });
        
        return true;
    }
    return false;
}

// Add dot indicator
function addDotIndicator(element) {
    const dot = document.createElement('span');
    dot.innerHTML = '●';
    dot.style.color = '#FFD700';
    dot.style.fontSize = '20px';
    dot.style.marginRight = '8px';
    dot.style.fontWeight = 'bold';
    
    if (element.tagName === 'LABEL') {
        element.insertBefore(dot, element.firstChild);
    } else {
        element.parentNode.insertBefore(dot, element);
    }
}

// Add color indicator
function addColorIndicator(element) {
    if (element.tagName === 'LABEL') {
        element.style.color = '#FFD700';
        element.style.fontWeight = 'bold';
    } else {
        element.style.color = '#FFD700';
        element.style.fontWeight = 'bold';
    }
}

// Add highlight indicator
function addHighlightIndicator(element) {
    if (element.tagName === 'LABEL') {
        element.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
        element.style.padding = '4px 8px';
        element.style.borderRadius = '4px';
    } else {
        element.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
        element.style.padding = '4px 8px';
        element.style.borderRadius = '4px';
    }
}

// Add border indicator
function addBorderIndicator(element) {
    if (element.tagName === 'LABEL') {
        element.style.border = '2px solid #FFD700';
        element.style.padding = '4px 8px';
        element.style.borderRadius = '4px';
    } else {
        element.style.border = '2px solid #FFD700';
        element.style.padding = '4px 8px';
        element.style.borderRadius = '4px';
    }
}

// Check questions limit
function checkQuestionsLimit(callback) {
    try {
        console.log('=== checkQuestionsLimit called ===');
        
        if (typeof browserAPI !== 'undefined' && browserAPI && browserAPI.storage) {
            browserAPI.storage.sync.get(['tokensBalance'], function(result) {
                if (chrome.runtime.lastError) {
                    console.error('Error loading tokens balance:', chrome.runtime.lastError);
                    callback(true);
                    return;
                }
                
                const tokensBalance = result.tokensBalance || TOKEN_CONFIG.initialTokens;
                const hasEnoughTokens = tokensBalance >= TOKEN_CONFIG.tokensPerQuestion;
                
                console.log('Token check:');
                console.log('- Current balance:', tokensBalance);
                console.log('- Tokens needed:', TOKEN_CONFIG.tokensPerQuestion);
                console.log('- Has enough tokens:', hasEnoughTokens);
                
                callback(hasEnoughTokens);
            });
        } else {
            // If browserAPI is not available, allow the request
            console.log('BrowserAPI not available, allowing request');
            callback(true);
        }
    } catch (error) {
        console.log('Error in checkQuestionsLimit:', error);
        callback(true);
    }
}

// Increment questions usage
// Increment questions usage (deduct tokens)
function incrementQuestionsUsage() {
    try {
        console.log('=== incrementQuestionsUsage called ===');
        
        if (typeof browserAPI !== 'undefined' && browserAPI && browserAPI.storage) {
            browserAPI.storage.sync.get(['tokensBalance'], function(result) {
                if (chrome.runtime.lastError) {
                    console.error('Error loading tokens balance:', chrome.runtime.lastError);
                    return;
                }
                
                const currentBalance = result.tokensBalance || TOKEN_CONFIG.initialTokens;
                const newBalance = Math.max(0, currentBalance - TOKEN_CONFIG.tokensPerQuestion);
                
                console.log('Token deduction:');
                console.log('- Current balance:', currentBalance);
                console.log('- Tokens per question:', TOKEN_CONFIG.tokensPerQuestion);
                console.log('- New balance:', newBalance);
                
                browserAPI.storage.sync.set({ tokensBalance: newBalance }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving tokens balance:', chrome.runtime.lastError);
                        return;
                    }
                    console.log('Tokens balance updated in storage:', newBalance);
                });
                
                // Send token update to backend
                const userId = getUserId();
                fetch('http://localhost:3000/api/users/' + userId + '/tokens', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': 'ai_assistant_api_key_2024'
                    },
                    body: JSON.stringify({ tokens: newBalance })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Tokens updated in backend:', data);
                })
                .catch(error => {
                    console.log('Failed to update tokens in backend:', error);
                });
                
                // Also update request count
                browserAPI.storage.sync.get(['requestsToday', 'totalRequests'], function(items) {
                    const requestsToday = (items.requestsToday || 0) + 1;
                    const totalRequests = (items.totalRequests || 0) + 1;
                    
                    browserAPI.storage.sync.set({
                        requestsToday: requestsToday,
                        totalRequests: totalRequests
                    });
                    
                    // Send request count to backend
                    fetch('http://localhost:3000/api/users/' + userId + '/requests', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'ai_assistant_api_key_2024'
                        },
                        body: JSON.stringify({ increment: 1 })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Request count updated:', data);
                    })
                    .catch(error => {
                        console.log('Failed to update request count:', error);
                    });
                });
            });
        } else {
            console.log('BrowserAPI not available, skipping token deduction');
        }
    } catch (error) {
        console.log('Error in incrementQuestionsUsage:', error);
    }
}

// Show questions limit message
function showQuestionsLimitMessage() {
    const message = document.createElement('div');
    message.innerHTML = 'Токени закінчилися! <a href="#" onclick="openSubscriptionPage()" style="color: #FFD700; text-decoration: underline;">Поповніть баланс</a> для продовження.';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #FF6B6B;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 8000);
}

// Handle test interaction
function handleTestInteraction() {
    if (!isTestPage()) return;
    
    checkQuestionsLimit(function(canMakeRequest) {
        if (!canMakeRequest) {
            showQuestionsLimitMessage();
            return;
        }
        
        getWorkMode(function(workMode) {
            if (workMode === 'hidden') {
                const question = findFirstParagraph();
                if (question) {
                    question.style.cursor = 'pointer';
                    question.style.border = '2px dashed #FFD700';
                    question.style.padding = '8px';
                    question.style.borderRadius = '4px';
                    
                    question.addEventListener('click', function() {
                        if (clickCorrectAnswer()) {
                            incrementQuestionsUsage();
                        }
                    });
                }
            } else if (workMode === 'manual') {
                if (highlightCorrectAnswers()) {
                    incrementQuestionsUsage();
                }
            }
        });
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleTestInteraction);
} else {
    handleTestInteraction();
}
