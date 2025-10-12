// Content Script for AI Assistant Extension
// Handles test page interaction and answer selection

console.log('Content script loaded - browserAPI:', browserAPI, 'isFirefox:', isFirefox, 'isChrome:', isChrome);

// Token management functions
function incrementQuestionsUsage() {
    if (!browserAPI || !browserAPI.storage) {
        console.log('Storage API not available');
        return;
    }
    
    try {
        browserAPI.storage.sync.get(['tokensBalance'], function(items) {
            if (browserAPI.runtime.lastError) {
                console.error('Error loading tokens:', browserAPI.runtime.lastError);
                return;
            }
            
            const currentBalance = items.tokensBalance || TOKEN_CONFIG.initialTokens;
            const newBalance = Math.max(0, currentBalance - TOKEN_CONFIG.tokensPerQuestion);
            
            browserAPI.storage.sync.set({ tokensBalance: newBalance }, function() {
                if (browserAPI.runtime.lastError) {
                    console.error('Error saving tokens:', browserAPI.runtime.lastError);
                } else {
                    console.log(`Token used. New balance: ${newBalance}`);
                }
            });
        });
    } catch (error) {
        console.log('Extension context invalidated during token update:', error);
    }
}

function checkQuestionsLimit(callback) {
    if (!browserAPI || !browserAPI.storage) {
        callback(true); // Allow if storage not available
        return;
    }
    
    try {
        browserAPI.storage.sync.get(['tokensBalance'], function(items) {
            if (browserAPI.runtime.lastError) {
                console.error('Error loading tokens:', browserAPI.runtime.lastError);
                callback(true);
                return;
            }
            
            const currentBalance = items.tokensBalance || TOKEN_CONFIG.initialTokens;
            const canMakeRequest = currentBalance >= TOKEN_CONFIG.tokensPerQuestion;
            
            console.log(`Current balance: ${currentBalance}, can make request: ${canMakeRequest}`);
            callback(canMakeRequest);
        });
    } catch (error) {
        console.log('Extension context invalidated during limit check:', error);
        callback(true); // Allow if context invalidated
    }
}

// Enhanced test detection - simplified (no keyword checking)
function isTestPageEnhanced() {
    // Check for specific test elements only
    const testElements = document.querySelectorAll(`
        .test-content-text, .test-question-options, .test-options-grid,
        .question, .quiz-question, .task, .exercise, .lesson-content,
        input[type="radio"], input[type="checkbox"], .option, .answer-option,
        .test-container, .quiz-container, .lesson-container
    `);
    
    // Check for answer options
    const hasAnswerOptions = document.querySelectorAll(`
        input[type="radio"], input[type="checkbox"], 
        .option, .answer-option, .choice, label[for*="answer"]
    `).length > 0;
    
    // Simple check: if we have test elements or answer options, it's a test page
    const isTestPage = testElements.length > 0 || hasAnswerOptions;
    
    console.log('Test detection results:', {
        testElementsCount: testElements.length,
        hasAnswerOptions: hasAnswerOptions,
        isTestPage: isTestPage
    });
    
    return isTestPage;
}

// Enhanced answer finding
function findAnswerOptionsEnhanced() {
    const optionSelectors = [
        'input[type="radio"]',
        'input[type="checkbox"]',
        '.option',
        '.answer-option',
        '.choice',
        'label[for*="answer"]',
        'label[for*="option"]',
        '.test-options-grid p',
        '.test-question-options p'
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

// Enhanced question finding - find individual questions
function findQuestionEnhanced() {
    const questionSelectors = [
        '.test-content-text p',
        '.question',
        '.question-text',
        '.quiz-question',
        '[data-question]',
        'p'
    ];
    
    for (const selector of questionSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            // Return only the first question for now
            return elements[0].outerHTML.replace(/\&nbsp;/g, '');
        }
    }
    
    return null;
}

// Find all questions on the page - using original logic from startscriot.js
function findAllQuestions() {
    // Use original logic from startscriot.js
    let questions = document.querySelector(".test-content-text")?.querySelectorAll('p');
    
    if (!questions || questions.length === 0) {
        console.log('No questions found in .test-content-text');
        return [];
    }
    
    // Convert to array like in original code
    let question = Array.from(questions).map(n => n.outerHTML.replace(/\&nbsp;/g, '')).join(',');
    console.log(`Found ${questions.length} questions: ${question.substring(0, 200)}...`);
    
    // Return array of question objects
    return Array.from(questions).map((q, index) => ({
        text: q.textContent.trim(),
        element: q,
        html: q.outerHTML,
        index: index
    }));
}

// Enhanced answer parsing - find answers for specific question
function findAnswersEnhanced(questionElement = null) {
    // Use original simple approach - get all answers from .test-question-options
    const answers = document.querySelector(".test-question-options")?.querySelectorAll('p');
    
    if (!answers || answers.length === 0) {
        console.log('No answers found in .test-question-options');
        return null;
    }
    
    // Convert to array and join like in original code
    let answer = Array.from(answers).map(n => n.outerHTML.replace(/\&nbsp;/g, '')).join(',');
    console.log(`Found ${answers.length} answers: ${answer.substring(0, 200)}...`);
    
    return answer;
}

// Enhanced answer options finding
function findAnswerOptionsEnhanced() {
    console.log('=== findAnswerOptionsEnhanced called ===');
    
    // Use original selector from pressright.js
    const options = document.querySelectorAll('.test-options-grid p');
    console.log(`Found ${options.length} options with .test-options-grid p selector`);
    
    if (options.length > 0) {
        return Array.from(options);
    }
    
    // Fallback to other selectors
    const fallbackSelectors = [
        '.test-question-options p',
        '.option',
        '.answer-option',
        'input[type="radio"]',
        'input[type="checkbox"]',
        'label'
    ];
    
    for (const selector of fallbackSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`Found ${elements.length} options with fallback selector: ${selector}`);
            return Array.from(elements);
        }
    }
    
    console.log('No answer options found with any selector');
    return [];
}

// Check if specific question is multiple choice - using original logic from startscriot.js
function isMultipleChoiceTest(questionElement = null) {
    // Use original logic from startscriot.js
    let result = false;
    
    document.querySelectorAll('p').forEach(element => {
        if (result) return;
        // Just looking for thing that exists only with multiple answer
        let multiple = element.parentElement.parentElement.querySelectorAll(".question-checkbox-state");
        multiple.forEach(obj => {
            if (obj) {
                result = true;
                return 0;
            }
        });
    });
    
    console.log(`Question type check: multiple choice = ${result}`);
    return result;
}

// Enhanced click handling - using original logic from pressright.js
function clickCorrectAnswerEnhanced(answer, multi = false) {
    let rightAnswer = null;
    let listOfAnswers = [null]; // Start with null like in original
    
    console.log(`Looking for answer: "${answer}"`);
    console.log(`Multi-choice mode: ${multi}`);
    
    // Use original selector from pressright.js
    document.querySelectorAll('.test-options-grid p').forEach(p => {
        let text = p.outerHTML.replace(/\&nbsp;/g, '');
        
        if (text === answer && !multi) {
            rightAnswer = p.offsetParent;
            console.log(`Found single choice answer: "${text.substring(0, 50)}..."`);
        }
        
        if (answer.includes(text) && multi) {
            listOfAnswers.push(p.offsetParent);
            console.log(`Found multiple choice answer: "${text.substring(0, 50)}..."`);
        }
    });
    
    if (multi && listOfAnswers.length > 1) {
        console.log(`Clicking ${listOfAnswers.length - 1} multiple choice answers`);
        for (let i = listOfAnswers.length - 1; i > 0; i--) {
            if (listOfAnswers[i]) {
                listOfAnswers[i].click();
                console.log('Clicked multiple choice option');
            }
        }
        return true;
    } else if (!multi && rightAnswer) {
        console.log('Clicking single choice answer');
        rightAnswer.click();
        return true;
    }
    
    console.log('No matching answer found');
    return false;
}

// Find answer options for specific question
function findAnswerOptionsForQuestion(questionElement) {
    const answerSelectors = [
        '.test-question-options p',
        '.test-options-grid p',
        '.option',
        '.answer-option',
        'input[type="radio"]',
        'input[type="checkbox"]',
        'label'
    ];
    
    let options = [];
    
    // Try to find the question container first
    let questionContainer = questionElement.closest('.test-container, .question-container, .test-content-text');
    
    if (!questionContainer) {
        // If no specific container, look for answer elements that come after this question
        const allElements = Array.from(document.querySelectorAll('*'));
        const questionIndex = allElements.indexOf(questionElement);
        
        // Look for answer elements that come after this question
        for (let i = questionIndex + 1; i < allElements.length; i++) {
            const element = allElements[i];
            
            // Stop if we hit another question
            if (element.textContent.trim().length > 10 && 
                (element.textContent.includes('?') || 
                 element.textContent.includes('питання') ||
                 element.textContent.includes('завдання'))) {
                break;
            }
            
            // Check if this element is an answer option
            answerSelectors.forEach(selector => {
                if (element.matches && element.matches(selector)) {
                    if (!options.includes(element)) {
                        options.push(element);
                    }
                }
            });
        }
    } else {
        // Use the specific container
        answerSelectors.forEach(selector => {
            const elements = questionContainer.querySelectorAll(selector);
            elements.forEach(element => {
                if (!options.includes(element)) {
                    options.push(element);
                }
            });
        });
    }
    
    console.log(`Found ${options.length} answer options for this question`);
    return options;
}

// Highlight correct answers - using original logic
function highlightCorrectAnswers(correctAnswer, multi = false, questionElement = null) {
    let highlighted = false;
    
    console.log(`Highlighting: looking for "${correctAnswer}"`);
    console.log(`Multi-choice mode: ${multi}`);
    
    // Get display mode from storage
    let displayMode = 'dot'; // default
    if (browserAPI && browserAPI.storage) {
        try {
            browserAPI.storage.sync.get(['answerDisplayMode'], function(result) {
                if (!browserAPI.runtime.lastError && result.answerDisplayMode) {
                    displayMode = result.answerDisplayMode;
                }
            });
        } catch (error) {
            console.log('Could not get display mode, using default:', error);
        }
    }
    
    // Use original selector from pressright.js
    document.querySelectorAll('.test-options-grid p').forEach((p, index) => {
        let text = p.outerHTML.replace(/\&nbsp;/g, '');
        console.log(`Option ${index + 1}: "${text.substring(0, 100)}..."`);
        
        let isCorrect = false;
        
        if (multi && correctAnswer.includes(text)) {
            isCorrect = true;
            console.log(`Found multiple choice match: option ${index + 1}`);
        } else if (!multi && text === correctAnswer) {
            isCorrect = true;
            console.log(`Found single choice match: option ${index + 1}`);
        }
        
        if (isCorrect) {
            // Apply dot highlighting (only mode available)
            p.style.position = 'relative';
            p.style.paddingLeft = '15px';
            p.innerHTML = '<span style="position: absolute; left: 3px; top: 50%; transform: translateY(-50%); width: 4px; height: 4px; background: #000000; border-radius: 50%;"></span>' + p.innerHTML;
            highlighted = true;
            console.log('Highlighted correct answer with dot:', text.substring(0, 100) + '...');
        } else {
            // Reset any previous highlighting
            p.style.backgroundColor = '';
            p.style.border = '';
            p.style.borderRadius = '';
            p.style.color = '';
            p.style.fontWeight = '';
            p.style.position = '';
            p.style.paddingLeft = '';
        }
    });
    
    console.log(`Highlighting result: ${highlighted ? 'success' : 'failed'}`);
    
    // If no correct answer was found, don't highlight anything
    if (!highlighted) {
        console.log('No correct answer found - not highlighting any options');
    }
    
    return highlighted;
}

// Find the first paragraph (question) - enhanced for naurok.com.ua
function findFirstParagraph() {
    console.log('=== findFirstParagraph called ===');
    
    // Try naurok-specific selectors first
    const naurokSelectors = [
        '.test-content-text p',
        '.test-question-text',
        '.question-text',
        '.test-question p',
        '.test-question',
        '.question',
        '.quiz-question'
    ];
    
    for (const selector of naurokSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 5) {
            console.log(`Found question with selector: ${selector}`);
            console.log(`Question text: "${element.textContent.substring(0, 100)}..."`);
            return element;
        }
    }
    
    // Try to find any paragraph that looks like a question
    const allParagraphs = document.querySelectorAll('p');
    console.log(`Found ${allParagraphs.length} paragraphs total`);
    
    for (let i = 0; i < allParagraphs.length; i++) {
        const p = allParagraphs[i];
        const text = p.textContent.trim();
        
        if (text.length > 5 && 
            (text.includes('?') || 
             text.includes('питання') ||
             text.includes('завдання') ||
             text.includes('це-') ||
             text.includes('це:') ||
             text.includes('що') ||
             text.includes('як') ||
             text.includes('де') ||
             text.includes('коли'))) {
            console.log(`Found question paragraph ${i + 1}: "${text.substring(0, 100)}..."`);
            return p;
        }
    }
    
    // Last resort - first paragraph with content
    for (let i = 0; i < allParagraphs.length; i++) {
        const p = allParagraphs[i];
        if (p.textContent.trim().length > 3) {
            console.log(`Using first paragraph with content ${i + 1}: "${p.textContent.substring(0, 50)}..."`);
            return p;
        }
    }
    
    console.log('No question found in any paragraph');
    return null;
}

// Click on the first answer option - using original logic from pressright.js
function clickCorrectAnswer() {
    console.log('=== clickCorrectAnswer called ===');
    
    const options = findAnswerOptionsEnhanced();
    console.log(`Found ${options.length} answer options`);
    
    if (options.length === 0) {
        console.log('No answer options found');
        return false;
    }
    
    // Use the first option (simplified logic for click mode)
    const firstOption = options[0];
    console.log(`Attempting to click first option: "${firstOption.textContent.substring(0, 50)}..."`);
    
    // Try different click methods based on element type
    if (firstOption.tagName === 'INPUT') {
        console.log('Clicking input element');
        firstOption.click();
        return true;
    } else if (firstOption.tagName === 'LABEL') {
        console.log('Clicking label element');
        const input = document.querySelector(`input[id="${firstOption.getAttribute('for')}"]`);
        if (input) {
            console.log('Found associated input, clicking it');
            input.click();
        } else {
            console.log('No associated input found, clicking label directly');
            firstOption.click();
        }
        return true;
    } else {
        // For p elements, try to find clickable parent or input
        console.log('Element is paragraph, looking for clickable parent');
        
        // Try to find input or clickable element nearby
        const parent = firstOption.parentElement;
        if (parent) {
            const input = parent.querySelector('input[type="radio"], input[type="checkbox"]');
            if (input) {
                console.log('Found input in parent, clicking it');
                input.click();
                return true;
            }
        }
        
        // Try offsetParent method from original code
        if (firstOption.offsetParent) {
            console.log('Using offsetParent method');
            firstOption.offsetParent.click();
            return true;
        }
        
        // Last resort - click the element itself
        console.log('Clicking element directly');
        firstOption.click();
        return true;
    }
}

// Setup click mode - make questions clickable with AI
function setupClickMode() {
    console.log('Setting up click mode...');
    
    // Try to find question immediately
    let question = findFirstParagraph();
    
    if (!question) {
        console.log('Question not found immediately, trying again in 1 second...');
        setTimeout(() => {
            question = findFirstParagraph();
            if (question) {
                setupQuestionClickWithAI(question);
            } else {
                console.log('Still no question found after delay');
            }
        }, 1000);
        return;
    }
    
    setupQuestionClickWithAI(question);
}

// Setup click handler for a specific question with AI
function setupQuestionClickWithAI(question) {
    console.log(`Found question: "${question.textContent.substring(0, 100)}..."`);
    
    // Check if already has click handler
    if (question.hasAttribute('data-click-handler')) {
        console.log('Question already has click handler, skipping');
        return;
    }
    
    question.style.cursor = 'pointer';
    question.style.border = '2px dashed #FFD700';
    question.style.padding = '8px';
    question.style.borderRadius = '4px';
    question.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
    question.setAttribute('data-click-handler', 'true');
    
    question.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Question clicked, getting AI answer...');
        
        // Add visual feedback
        question.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
        setTimeout(() => {
            question.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
        }, 200);
        
        // Get AI answer first, then click the correct option
        getAIAnswerAndClick(question);
        
        // Remove click handler after use to allow for next question
        setTimeout(() => {
            question.removeAttribute('data-click-handler');
            console.log('Removed click handler, ready for next question');
        }, 2000);
    });
    
    console.log('Click mode setup complete - question is now clickable');
}

// Get AI answer and click the correct option
async function getAIAnswerAndClick(questionElement) {
    try {
        console.log('Getting AI answer for question...');
        
        // Find answers for this question
        const answers = findAnswersEnhanced(questionElement);
        if (!answers) {
            console.log('No answers found for question');
            return;
        }
        
        // Check if it's multiple choice
        const multi = isMultipleChoiceTest(questionElement);
        console.log(`Question type: ${multi ? 'multiple choice' : 'single choice'}`);
        
        // Get AI answer
        const result = await callGeminiApiEnhanced(questionElement.textContent, answers, multi);
        console.log(`AI Answer: "${result}"`);
        
        // Click the correct answer using original logic
        if (clickCorrectAnswerWithAI(result, multi)) {
            incrementQuestionsUsage();
            console.log('Successfully answered question with AI');
            
            // Show success feedback
            questionElement.style.border = '2px solid #4CAF50';
            questionElement.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        } else {
            console.log('Failed to click correct answer');
            
            // Show error feedback
            questionElement.style.border = '2px solid #FF6B6B';
            questionElement.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
            setTimeout(() => {
                questionElement.style.border = '2px dashed #FFD700';
                questionElement.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error getting AI answer:', error);
        
        // Show error feedback
        questionElement.style.border = '2px solid #FF6B6B';
        questionElement.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
        setTimeout(() => {
            questionElement.style.border = '2px dashed #FFD700';
            questionElement.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
        }, 1000);
    }
}

// Click correct answer using AI result - using original logic from pressright.js
function clickCorrectAnswerWithAI(answer, multi = false) {
    console.log('=== clickCorrectAnswerWithAI called ===');
    console.log(`Looking for answer: "${answer}"`);
    console.log(`Multiple choice: ${multi}`);
    
    let rightAnswer = null;
    let listOfAnswers = [null];
    
    // Use original logic from pressright.js
    document.querySelectorAll('.test-options-grid p').forEach(p => {
        let text = p.outerHTML.replace(/\&nbsp;/g, '');
        console.log(`Checking option: "${text.substring(0, 100)}..."`);
        
        if (text === answer && !multi) {
            rightAnswer = p.offsetParent;
            console.log('Found exact match for single choice');
        }
        
        if (answer.includes(text) && multi) {
            listOfAnswers.push(p.offsetParent);
            console.log('Found match for multiple choice');
        }
    });
    
    if (multi && listOfAnswers.length > 1) {
        console.log(`Clicking ${listOfAnswers.length - 1} multiple choice answers`);
        for (let i = listOfAnswers.length - 1; i > 0; i--) {
            if (listOfAnswers[i]) {
                listOfAnswers[i].click();
            }
        }
        return true;
    } else if (!multi && rightAnswer) {
        console.log('Clicking single choice answer');
        rightAnswer.click();
        return true;
    }
    
    console.log('No matching answer found');
    return false;
}

// Show API exhausted message
function showApiExhaustedMessage() {
    const message = document.createElement('div');
    message.innerHTML = '⚠️ Всі API ключі вичерпані. Спробуйте пізніше або зверніться до підтримки.';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #FF9500;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 10000);
}

// Show questions limit message
function showQuestionsLimitMessage() {
    const message = document.createElement('div');
    message.textContent = 'Досягнуто ліміт питань. Поповніть баланс токенів.';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 8000);
}

// Get work mode from storage
function getWorkMode(callback) {
    console.log('=== getWorkMode called ===');
    console.log('browserAPI available:', !!browserAPI);
    console.log('browserAPI.storage available:', !!(browserAPI && browserAPI.storage));
    
    if (browserAPI && browserAPI.storage) {
        try {
            console.log('Attempting to get workMode from storage...');
            browserAPI.storage.sync.get(['workMode'], function(result) {
                console.log('Storage get result:', result);
                
                if (browserAPI.runtime.lastError) {
                    console.log('Storage error, using default mode:', browserAPI.runtime.lastError);
                    callback('disabled');
                    return;
                }
                const workMode = result.workMode || 'disabled';
                console.log('Current work mode from storage:', workMode);
                callback(workMode);
            });
        } catch (error) {
            console.log('Extension context invalidated, using default mode:', error);
            callback('disabled');
        }
    } else {
        console.log('No browserAPI.storage available, using disabled mode');
        callback('disabled');
    }
}

// Enhanced monitoring
let lastScreenshot = null;
let processedQuestions = new Set();
let currentPageUrl = null;
let monitoringInterval = null;

function monitorPageChanges() {
    // Check if extension is disabled
    getWorkMode(function(workMode) {
        if (workMode === 'disabled') {
            console.log('Extension is disabled, skipping monitoring');
        return;
    }
    
        // Clear processed questions if page URL changed
        if (currentPageUrl !== window.location.href) {
            currentPageUrl = window.location.href;
            processedQuestions.clear();
            console.log('Page URL changed, cleared processed questions');
        }
        
        const currentScreenshot = Array.from(document.querySelectorAll('p')).map(n => n.outerHTML).join('');
        
        if (lastScreenshot !== currentScreenshot) {
            lastScreenshot = currentScreenshot;
            
            // Find all questions on the page
            const allQuestions = findAllQuestions();
            console.log(`Found ${allQuestions.length} questions on page`);
            
            // Process each question
            allQuestions.forEach((questionData, index) => {
                // Create more unique question ID
                const questionId = questionData.text.substring(0, 100) + '_' + questionData.element.tagName + '_' + index;
                
                if (!processedQuestions.has(questionId)) {
                    processedQuestions.add(questionId);
                    
                    console.log(`Processing question ${index + 1}:`, questionData.text.substring(0, 100) + '...');
                    
                    // Find answers for this specific question
                    const answers = findAnswersEnhanced(questionData.element);
                    const multi = isMultipleChoiceTest(questionData.element);
                    
                    console.log(`Question ${index + 1} type: ${multi ? 'multiple choice' : 'single choice'}`);
                    
                    if (answers && answers.length > 0) {
                        console.log('Question answers found:', answers.length, 'options');
                        
                        // Check if we have enough tokens
                        checkQuestionsLimit(function(canMakeRequest) {
                            if (!canMakeRequest) {
                                showQuestionsLimitMessage();
        return;
    }
    
                            // Call AI to get correct answer
                            callGeminiApiEnhanced(questionData.html, answers, multi)
                                .then(result => {
                                    console.log(`AI Answer for question ${index + 1}:`, result);
                                    
                                    // Get work mode again to make sure it hasn't changed
                                    getWorkMode(function(currentWorkMode) {
                                        if (currentWorkMode === 'disabled') {
                                            console.log('Extension disabled during processing, skipping');
            return;
        }
        
                                        if (currentWorkMode === 'auto') {
                                            // Auto mode with delay
                                            console.log(`Auto mode: will click answer for question ${index + 1} with delay`);
                                            
                                            // Get auto delay setting
                                            if (browserAPI && browserAPI.storage) {
                                                browserAPI.storage.sync.get(['autoDelay'], function(delayResult) {
                                                    const delay = (delayResult.autoDelay || 2) * 1000; // Convert to milliseconds
                                                    console.log(`Auto delay: ${delay}ms`);
                                                    
                                                    setTimeout(() => {
                                                        if (clickCorrectAnswerEnhanced(result, multi)) {
                                                            incrementQuestionsUsage();
                                                            console.log(`Successfully answered question ${index + 1} after ${delay}ms delay`);
                                                        } else {
                                                            console.log(`Failed to click answer for question ${index + 1}`);
                                                        }
                                                    }, delay);
        });
    } else {
                                                // Fallback: click immediately
                                                if (clickCorrectAnswerEnhanced(result, multi)) {
                                                    incrementQuestionsUsage();
                                                    console.log(`Successfully answered question ${index + 1} (no delay)`);
                                                } else {
                                                    console.log(`Failed to click answer for question ${index + 1}`);
                                                }
                                            }
                                        } else if (currentWorkMode === 'manual') {
                                            // Highlight mode
                                            console.log(`Attempting to highlight question ${index + 1} with answer: "${result}"`);
                                            if (highlightCorrectAnswers(result, multi, questionData.element)) {
                                                incrementQuestionsUsage();
                                                console.log(`Successfully highlighted question ${index + 1}`);
                                            } else {
                                                console.log(`Failed to highlight answer for question ${index + 1}`);
                                                console.log(`Answer was: "${result}"`);
                                                console.log(`Available options:`, findAnswerOptionsEnhanced().map(opt => opt.outerHTML.substring(0, 100) + '...'));
                                            }
                                        } else if (currentWorkMode === 'click') {
                                            // Click mode - setup clickable question
                                            console.log(`Setting up click mode for question ${index + 1}`);
                                            setupClickMode();
                                        }
                                    });
                                })
                                .catch(error => {
                                    console.error(`AI call failed for question ${index + 1}:`, error);
                                    
                                    // Show user-friendly message for API exhaustion
                                    if (error.message.includes('All API keys exhausted')) {
                                        showApiExhaustedMessage();
        }
    });
});
    } else {
                        console.log(`No answers found for question ${index + 1}`);
                    }
                } else {
                    console.log(`Question ${index + 1} already processed, skipping`);
                }
            });
        }
    });
}

// Start enhanced monitoring
function startEnhancedMonitoring() {
    if (window.monitoringStarted) {
        console.log('Monitoring already started, skipping...');
        return;
    }
    
    window.monitoringStarted = true;
    console.log('=== Starting enhanced monitoring ===');
    console.log('Page URL:', window.location.href);
    console.log('Page title:', document.title);
    
    // Check if extension is disabled
    getWorkMode(function(workMode) {
        if (workMode === 'disabled') {
            console.log('Extension is disabled, monitoring not started');
        return;
    }
    
        const isTest = isTestPageEnhanced();
        console.log('Is test page detected:', isTest);
        
        if (isTest) {
            console.log('Enhanced test monitoring started');
            
            // Handle click mode immediately without AI processing
            if (workMode === 'click') {
                console.log('Click mode detected - setting up clickable questions');
                setupClickMode();
                
                // Also monitor for new questions in click mode
                monitoringInterval = setInterval(() => {
                    const newQuestion = findFirstParagraph();
                    if (newQuestion && !newQuestion.hasAttribute('data-click-handler')) {
                        console.log('Found new question for click mode');
                        setupQuestionClickWithAI(newQuestion);
                    }
                }, 2000);
                
                return;
            }
            
            // Clear any existing interval
            if (monitoringInterval) {
                clearInterval(monitoringInterval);
            }
            
            // Initial check
            monitorPageChanges();
            
            // Monitor changes every 2 seconds
            monitoringInterval = setInterval(monitorPageChanges, 2000);
} else {
            console.log('No test detected on this page');
            
            // Clear any existing interval
            if (monitoringInterval) {
                clearInterval(monitoringInterval);
            }
            
            // Still monitor for changes in case test appears later
            console.log('Starting passive monitoring for test detection...');
            monitoringInterval = setInterval(() => {
                const isTestNow = isTestPageEnhanced();
                if (isTestNow) {
                    console.log('Test detected! Starting active monitoring...');
                    // Clear passive monitoring
                    if (monitoringInterval) {
                        clearInterval(monitoringInterval);
                    }
                    // Start active monitoring
                    monitoringInterval = setInterval(monitorPageChanges, 2000);
                    monitorPageChanges();
        }
    }, 5000);
}
    });
}

// Initialize when DOM is ready
console.log('=== Content script initialization ===');
console.log('Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    console.log('DOM is loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired, starting monitoring...');
        startEnhancedMonitoring();
    });
} else {
    console.log('DOM is ready, starting monitoring immediately...');
    startEnhancedMonitoring();
}

// Also try after a delay in case of timing issues
setTimeout(() => {
    console.log('=== Delayed initialization check ===');
    if (!window.monitoringStarted) {
        console.log('Monitoring not started yet, trying again...');
        startEnhancedMonitoring();
    }
}, 2000);
