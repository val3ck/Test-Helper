// Subscription Script for AI Assistant Extension
// Handles token purchase and friend code functionality

console.log('Subscription script loaded - browserAPI:', browserAPI, 'isFirefox:', isFirefox, 'isChrome:', isChrome);

// Current payment data
let currentPayment = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadCurrentBalance();
    
    // Listen for storage changes to sync balance
    if (browserAPI && browserAPI.storage) {
        browserAPI.storage.onChanged.addListener(function(changes, namespace) {
            if (namespace === 'sync' && changes.tokensBalance) {
                loadCurrentBalance();
            }
        });
    }
    
    // Update balance when window gets focus (user returns from popup)
    window.addEventListener('focus', function() {
        loadCurrentBalance();
    });
});

// Setup event listeners
function setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Запобігаємо стандартній поведінці
            // Try to close window, but don't show error if it fails
            try {
                window.close();
            } catch (error) {
                // If we can't close the window, try to go back in history
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    // If no history, redirect to popup
                    window.location.href = 'popup.html';
                }
            }
        });
    }

    // Token purchase buttons
    const buyButtons = document.querySelectorAll('.btn-buy-tokens');
    console.log('Found buy buttons:', buyButtons.length);
    
    buyButtons.forEach((button, index) => {
        console.log(`Setting up button ${index}:`, button);
        button.addEventListener('click', function(e) {
            e.preventDefault(); // Запобігаємо стандартній поведінці
            const tokens = parseInt(this.getAttribute('data-tokens'));
            const price = parseInt(this.getAttribute('data-price'));
            console.log(`Button ${index} clicked:`, tokens, 'tokens,', price, 'price');
            buyTokens(tokens, price);
        });
    });

    // Payment modal buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="confirm"]')) {
            e.preventDefault();
            confirmPayment();
        } else if (e.target.matches('[data-action="cancel"]')) {
            e.preventDefault();
            hidePaymentOverlay();
        }
    });

    // Close overlay on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('paymentOverlay');
            if (overlay && overlay.style.display !== 'none') {
                hidePaymentOverlay();
            }
        }
    });
    
    // Hidden friend code event listeners
    const hiddenCodeTrigger = document.getElementById('hiddenCodeTrigger');
    if (hiddenCodeTrigger) {
        hiddenCodeTrigger.addEventListener('click', function(e) {
            e.preventDefault(); // Запобігаємо стандартній поведінці
            const inputDiv = document.getElementById('hiddenCodeInput');
            if (inputDiv) {
                inputDiv.style.display = inputDiv.style.display === 'none' ? 'flex' : 'none';
                if (inputDiv.style.display === 'flex') {
                    const input = document.getElementById('hiddenFriendCode');
                    if (input) {
                        input.focus();
                    }
                }
            }
        });
    }
    
    const hiddenApplyCodeBtn = document.getElementById('hiddenApplyCode');
    if (hiddenApplyCodeBtn) {
        hiddenApplyCodeBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Запобігаємо стандартній поведінці
            const codeInput = document.getElementById('hiddenFriendCode');
            if (codeInput && codeInput.value.trim()) {
                applyHiddenFriendCode(codeInput.value.trim());
                codeInput.value = ''; // Clear input after applying
            } else {
                showHiddenCodeStatus('Введіть код!', 'error');
            }
        });
    }
    
    // Enter key support for hidden friend code input
    const hiddenFriendCodeInput = document.getElementById('hiddenFriendCode');
    if (hiddenFriendCodeInput) {
        hiddenFriendCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const applyBtn = document.getElementById('hiddenApplyCode');
                if (applyBtn) {
                    applyBtn.click();
                }
            }
        });
    }
    
    // Payment overlay buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('.btn[data-action="confirm"]')) {
            // Handle payment confirmation with real verification
            handlePaymentConfirmation(e.target);
        } else if (e.target.matches('.btn[data-action="cancel"]')) {
            // Handle payment cancellation
            console.log('=== PAYMENT CANCELLED ===');
            console.log('User cancelled payment for:', currentPayment.tokens, 'tokens,', currentPayment.price, 'UAH');
            hidePaymentOverlay();
        }
    });
}

// Load current balance
function loadCurrentBalance() {
    console.log('Loading current balance...');
    
    if (browserAPI && browserAPI.storage) {
        browserAPI.storage.sync.get(['tokensBalance'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading balance:', chrome.runtime.lastError);
                return;
            }
            
            const balance = result.tokensBalance || TOKEN_CONFIG.initialTokens;
            console.log('Balance from storage:', balance);
            
            const balanceElement = document.getElementById('currentTokens');
            if (balanceElement) {
                balanceElement.textContent = balance;
                console.log('Balance updated in UI:', balance);
            } else {
                console.error('Balance element not found!');
            }
        });
    } else {
        // Fallback for direct HTML
        console.log('BrowserAPI not available, using fallback');
        const balanceElement = document.getElementById('currentTokens');
        if (balanceElement) {
            balanceElement.textContent = TOKEN_CONFIG.initialTokens;
        }
    }
}

// Friend code functions
function validateFriendCode(code) {
    return FRIEND_CODE_CONFIG.validCodes.includes(code.toUpperCase());
}

function applyHiddenFriendCode(code) {
    if (!validateFriendCode(code)) {
        showHiddenCodeStatus('Невірний код!', 'error');
        return false;
    }
    
    // Check if code was already used
    if (browserAPI && browserAPI.storage) {
        browserAPI.storage.sync.get(['usedFriendCodes'], function(result) {
            const usedCodes = result.usedFriendCodes || [];
            if (usedCodes.includes(code.toUpperCase())) {
                showHiddenCodeStatus('Код вже використано!', 'error');
                return;
            }
            
            // Add code to used list and give tokens
            usedCodes.push(code.toUpperCase());
            
            // Get current balance and add tokens
            browserAPI.storage.sync.get(['tokensBalance'], function(balanceResult) {
                const currentBalance = balanceResult.tokensBalance || TOKEN_CONFIG.initialTokens;
                const newBalance = currentBalance + FRIEND_CODE_CONFIG.specialTokens;
                
                console.log(`Friend code applied: ${code}`);
                console.log(`Current balance: ${currentBalance}`);
                console.log(`Tokens to add: ${FRIEND_CODE_CONFIG.specialTokens}`);
                console.log(`New balance: ${newBalance}`);
                
    browserAPI.storage.sync.set({
                    usedFriendCodes: usedCodes,
                    tokensBalance: newBalance
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving to storage:', chrome.runtime.lastError);
                        showHiddenCodeStatus('Помилка збереження! Спробуйте ще раз.', 'error');
                        return;
                    }
                    
                    console.log('Storage updated successfully');
                    
                    // Verify the save by reading back
                    browserAPI.storage.sync.get(['tokensBalance'], function(verifyResult) {
                        if (chrome.runtime.lastError) {
                            console.error('Error reading from storage:', chrome.runtime.lastError);
                            showHiddenCodeStatus('Помилка перевірки збереження!', 'error');
                            return;
                        }
                        
                        console.log('Verified balance in storage:', verifyResult.tokensBalance);
                        
                        showHiddenCodeStatus(`Код успішно застосовано! Отримано ${FRIEND_CODE_CONFIG.specialTokens} токенів! Новий баланс: ${newBalance}`, 'success');
                        loadCurrentBalance();
                        
                        // Hide the input after successful application
    setTimeout(() => {
                            const inputDiv = document.getElementById('hiddenCodeInput');
                            if (inputDiv) {
                                inputDiv.style.display = 'none';
                            }
                        }, 2000);
                    });
                });
            });
        });
        } else {
        // Fallback for direct HTML
        showHiddenCodeStatus(`Код успішно застосовано! Отримано ${FRIEND_CODE_CONFIG.specialTokens} токенів!`, 'success');
        console.log('Note: In extension context, tokens will be properly added to balance');
    }
}

function showHiddenCodeStatus(message, type) {
    const statusElement = document.getElementById('hiddenCodeStatus');
    if (statusElement) {
    statusElement.textContent = message;
        statusElement.className = `hidden-code-status ${type}`;
    
        // Auto-hide after 3 seconds
    setTimeout(() => {
            statusElement.className = 'hidden-code-status';
    }, 3000);
    }
}

// Buy tokens
async function buyTokens(tokens, price) {
    console.log('=== PAYMENT ATTEMPT ===');
    console.log('User wants to buy:', tokens, 'tokens for', price, 'UAH');
    console.log('Timestamp:', new Date().toISOString());
    
    try {
        // Create payment in backend first
        const userId = getUserId();
        console.log('Creating payment in backend...');
        
        const response = await fetch('http://localhost:3000/api/payments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'ai_assistant_api_key_2024'
            },
            body: JSON.stringify({
                tokens: tokens,
                price: price,
                user_id: userId
            })
        });
        
        const data = await response.json();
        console.log('Backend payment creation response:', data);
        
        if (data.success) {
            // Use payment code from backend
            currentPayment = {
                tokens: tokens,
                price: price,
                paymentCode: data.payment.payment_code
            };
            
            console.log('Payment details created:', currentPayment);
            console.log('Opening payment overlay...');
            showPaymentOverlay();
        } else {
            console.error('Failed to create payment in backend:', data);
            alert('Помилка створення платежу. Спробуйте пізніше.');
        }
        
    } catch (error) {
        console.error('Error creating payment:', error);
        alert('Помилка створення платежу. Перевірте підключення до сервера.');
    }
}

// Generate unique payment code
function generatePaymentCode() {
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `PAY-${random}`;
}

// Show payment overlay
function showPaymentOverlay() {
    console.log('showPaymentOverlay called');
    const overlay = document.getElementById('paymentOverlay');
    console.log('Overlay element:', overlay);
    
    if (overlay) {
        // Update payment details
        const paymentTokensElement = document.getElementById('paymentTokens');
        const paymentAmountElement = document.getElementById('paymentAmount');
        const paymentCodeElement = document.getElementById('paymentCode');
        
        console.log('Payment elements:', {
            tokens: paymentTokensElement,
            amount: paymentAmountElement,
            code: paymentCodeElement
        });
        
        if (paymentTokensElement) paymentTokensElement.textContent = currentPayment.tokens;
        if (paymentAmountElement) paymentAmountElement.textContent = '₴' + currentPayment.price;
        if (paymentCodeElement) paymentCodeElement.textContent = currentPayment.paymentCode;
        
        // Load payment instructions
        loadPaymentInstructions();
        
        // Show overlay
        overlay.style.display = 'flex';
        console.log('Overlay should now be visible');
    } else {
        console.error('Payment overlay element not found!');
    }
}

// Load payment instructions
function loadPaymentInstructions() {
    const instructionsElement = document.getElementById('paymentInstructions');
    if (!instructionsElement) {
        console.error('Payment instructions element not found');
        return;
    }
    
    const paymentCode = currentPayment.paymentCode;
    const amount = currentPayment.price;
    
    instructionsElement.innerHTML = `
        <h4>💰 Спосіб оплати: Monobank Банка</h4>
        <ol>
            <li>Відкрийте додаток Monobank або перейдіть на сайт</li>
            <li>Перекажіть <strong>₴${amount}</strong> на банку:<br>
                <span class="card-number">4874 1000 2954 2886</span><br>
                <a href="https://send.monobank.ua/jar/5jNh12Sjnw" target="_blank" class="jar-link">https://send.monobank.ua/jar/5jNh12Sjnw</a>
            </li>
            <li>В коментарі до платежу вкажіть код:<br>
                <span class="payment-code-highlight">${paymentCode}</span>
            </li>
            <li>Після оплати натисніть "Підтвердити оплату"</li>
        </ol>
    `;
    
    console.log('Payment instructions loaded');
}

// Handle payment confirmation with verification
async function handlePaymentConfirmation(confirmBtn) {
    console.log('=== PAYMENT CONFIRMATION REQUESTED ===');
    console.log('Payment details:', currentPayment);
    console.log('User wants to confirm payment for:', currentPayment.tokens, 'tokens,', currentPayment.price, 'UAH');
    console.log('Payment code:', currentPayment.paymentCode);
    
    // Show loading state
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Перевіряємо платіж...';
    confirmBtn.disabled = true;
    
    try {
        // Check payment status with backend
        const paymentStatus = await checkPaymentStatus(currentPayment.paymentCode);
        
        if (paymentStatus.success) {
            console.log('✅ Payment verified! Adding tokens...');
            addTokensToBalance(paymentStatus.tokens);
            hidePaymentOverlay();
            
            // Show success message
            showPaymentMessage('✅ Платіж підтверджено! Токени додано до вашого балансу.', 'success');
        } else {
            console.log('❌ Payment verification failed:', paymentStatus.message);
            
            // Show error message
            showPaymentMessage(`❌ ${paymentStatus.message}`, 'error');
            
            // Restore button
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error in payment confirmation:', error);
        showPaymentMessage('❌ Помилка перевірки платежу. Спробуйте пізніше.', 'error');
        
        // Restore button
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
}

// Show payment message
function showPaymentMessage(message, type) {
    console.log(`Payment message (${type}):`, message);
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `payment-message ${type}`;
    messageDiv.textContent = message;
    
    // Style the message
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ${type === 'success' ? 'background: #4CAF50;' : 'background: #f44336;'}
    `;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// Hide payment overlay
function hidePaymentOverlay() {
    const overlay = document.getElementById('paymentOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Check payment status with backend
async function checkPaymentStatus(paymentCode) {
    console.log('=== CHECKING PAYMENT STATUS ===');
    console.log('Payment code:', paymentCode);
    
    try {
        const userId = getUserId();
        console.log('User ID:', userId);
        
        const response = await fetch('http://localhost:3000/api/payments/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'ai_assistant_api_key_2024'
            },
            body: JSON.stringify({
                payment_code: paymentCode,
                user_id: userId
            })
        });
        
        const data = await response.json();
        console.log('Payment status response:', data);
        
        if (data.success && data.payment_status === 'completed') {
            console.log('✅ Payment confirmed! Adding tokens...');
            return { success: true, tokens: data.payment.tokens };
        } else if (data.success && data.payment_status === 'pending') {
            console.log('⏳ Payment still pending...');
            return { success: false, status: 'pending', message: 'Платіж ще не підтверджено. Спробуйте через кілька хвилин.' };
        } else {
            console.log('❌ Payment not found or failed');
            return { success: false, status: 'not_found', message: 'Платіж не знайдено або не вдалося перевірити.' };
        }
        
    } catch (error) {
        console.error('Error checking payment status:', error);
        return { success: false, status: 'error', message: 'Помилка перевірки платежу. Спробуйте пізніше.' };
    }
}

// Add tokens to balance
function addTokensToBalance(tokens) {
    console.log('=== ADDING TOKENS TO BALANCE ===');
    console.log('Adding tokens:', tokens);
    
    if (browserAPI && browserAPI.storage) {
        browserAPI.storage.sync.get(['tokensBalance'], function(result) {
            const currentBalance = result.tokensBalance || TOKEN_CONFIG.initialTokens;
            const newBalance = currentBalance + tokens;
            
            console.log('Balance update:', {
                currentBalance: currentBalance,
                tokensToAdd: tokens,
                newBalance: newBalance
            });
            
            browserAPI.storage.sync.set({ tokensBalance: newBalance }, function() {
                console.log('✅ Tokens successfully added to balance!');
                console.log(`Previous balance: ${currentBalance}`);
                console.log(`Tokens added: ${tokens}`);
                console.log(`New balance: ${newBalance}`);
                
                // Update backend with new balance
                const userId = getUserId();
                console.log('🔄 Sending balance update to backend...');
                console.log('User ID:', userId);
                console.log('New balance to send:', newBalance);
                
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
                    console.log('✅ Backend updated successfully:', data);
                })
                .catch(error => {
                    console.log('❌ Failed to update backend:', error);
                });
                
                // Update balance display
                loadCurrentBalance();
            });
        });
    }
}

// Privacy link handler
const privacyLink = document.getElementById('privacyLink');
if (privacyLink) {
    privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        showPrivacy();
    });
}

// Version: 1.1 - CSP compliant


