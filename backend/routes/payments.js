const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');
const monobankService = require('../services/monobank');
const config = require('../config');

const router = express.Router();

// Middleware to validate API key
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey || apiKey !== config.API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Valid API key required' 
    });
  }
  
  next();
};

// Generate unique payment code
function generatePaymentCode() {
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `PAY-${random}`;
}

// Create new payment
router.post('/create', validateApiKey, async (req, res) => {
  try {
    const { tokens, price, user_id } = req.body;

    // Validate input
    if (!tokens || !price) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'tokens and price are required'
      });
    }

    // Validate token amount
    const validTokenAmounts = [10, 20, 30, 50, 100, 200];
    if (!validTokenAmounts.includes(parseInt(tokens))) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid token amount. Must be one of: 10, 20, 30, 50, 100, 200'
      });
    }

    // Generate payment code
    const paymentCode = generatePaymentCode();

    // Create payment record
    const paymentData = {
      payment_code: paymentCode,
      user_id: user_id || 'anonymous',
      tokens: parseInt(tokens),
      price: parseFloat(price),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const payment = await database.createPayment(paymentData);

    // Return payment instructions
    res.json({
      success: true,
      payment: {
        payment_code: paymentCode,
        tokens: parseInt(tokens),
        price: parseFloat(price),
        status: 'pending'
      },
      instructions: {
        jar_url: config.MONOBANK_JAR_URL,
        jar_id: config.MONOBANK_JAR_ID,
        amount: parseFloat(price),
        description: paymentCode,
        steps: [
          'Click the link below to open Monobank jar',
          'Enter your name',
          `Enter amount: ₴${price}`,
          `Enter comment: ${paymentCode}`,
          'Complete payment via card or Mono Pay'
        ]
      }
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Check payment status
router.post('/check', validateApiKey, async (req, res) => {
  try {
    const { payment_code, user_id } = req.body;

    if (!payment_code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'payment_code is required'
      });
    }

    // Get payment from database
    const payment = await database.getPaymentByCode(payment_code);
    
    if (!payment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Payment not found'
      });
    }

    // Check if payment is already completed
    if (payment.status === 'completed') {
      return res.json({
        success: true,
        payment_status: 'completed',
        payment: payment
      });
    }

    // Check Monobank Jar for new transactions
    try {
      const jarTransactions = await monobankService.getJarTransactions();
      
      // Look for transaction with matching description/comment
      const matchingTransaction = jarTransactions.find(tx => 
        tx.description && tx.description.includes(payment_code)
      );

      if (matchingTransaction) {
        // Update payment status to completed
        await database.updatePaymentStatus(payment_code, 'completed');
        
        // Add tokens to user's balance
        await database.addTokensToUser(user_id || payment.user_id, payment.tokens);
        
        return res.json({
          success: true,
          payment_status: 'completed',
          payment: {
            ...payment,
            status: 'completed',
            completed_at: new Date().toISOString()
          }
        });
      } else {
        // TEST MODE: Simulate payment completion for testing
        // Remove this block when real Monobank API is configured
        if ((process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) && payment.price <= 50) {
          console.log('🧪 TEST MODE: Simulating payment completion for testing');
          await database.updatePaymentStatus(payment_code, 'completed');
          await database.addTokensToUser(user_id || payment.user_id, payment.tokens);
          
          return res.json({
            success: true,
            payment_status: 'completed',
            payment: {
              ...payment,
              status: 'completed',
              completed_at: new Date().toISOString()
            },
            note: 'Payment completed in test mode'
          });
        }
        
        return res.json({
          success: true,
          payment_status: 'pending',
          payment: payment
        });
      }
    } catch (monobankError) {
      console.error('Monobank API error:', monobankError);
      
      // TEST MODE: If Monobank API fails, simulate completion for small amounts
      if ((process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) && payment.price <= 50) {
        console.log('🧪 TEST MODE: Monobank API failed, simulating payment completion');
        await database.updatePaymentStatus(payment_code, 'completed');
        await database.addTokensToUser(user_id || payment.user_id, payment.tokens);
        
        return res.json({
          success: true,
          payment_status: 'completed',
          payment: {
            ...payment,
            status: 'completed',
            completed_at: new Date().toISOString()
          },
          note: 'Payment completed in test mode (Monobank API unavailable)'
        });
      }
      
      return res.json({
        success: true,
        payment_status: 'pending',
        payment: payment,
        note: 'Unable to verify payment status'
      });
    }

  } catch (error) {
    console.error('Error checking payment:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Get payment details
router.get('/:payment_code', validateApiKey, async (req, res) => {
  try {
    const { payment_code } = req.params;

    const payment = await database.getPaymentByCode(payment_code);

    if (!payment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        payment_code: payment.payment_code,
        tokens: payment.tokens,
        price: payment.price,
        status: payment.status,
        created_at: payment.created_at,
        completed_at: payment.completed_at
      }
    });

  } catch (error) {
    console.error('Error getting payment:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get payment'
    });
  }
});

// Get all pending payments (admin endpoint)
router.get('/admin/pending', validateApiKey, async (req, res) => {
  try {
    const pendingPayments = await database.getPendingPayments();
    
    res.json({
      success: true,
      payments: pendingPayments
    });

  } catch (error) {
    console.error('Error getting pending payments:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pending payments'
    });
  }
});

// Get all transactions (admin endpoint)
router.get('/admin/transactions', validateApiKey, async (req, res) => {
  try {
    const transactions = await database.getUnprocessedTransactions();
    
    res.json({
      success: true,
      transactions: transactions
    });

  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get transactions'
    });
  }
});

// Update user tokens
router.post('/users/:userId/tokens', validateApiKey, async (req, res) => {
  try {
    const { userId } = req.params;
    const { tokens } = req.body;
    
    if (!tokens || typeof tokens !== 'number') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Tokens count is required and must be a number' 
      });
    }
    
    // Update user tokens in database
    await database.updateUserTokens(userId, tokens);
    
    res.json({ 
      success: true, 
      message: 'Tokens updated successfully',
      tokens_balance: tokens
    });
  } catch (error) {
    console.error('Error updating user tokens:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to update user tokens' 
    });
  }
});

// Get user token balance
router.get('/users/:userId/tokens', validateApiKey, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user token balance from database
    const tokensBalance = await database.getUserTokenBalance(userId);
    
    res.json({ 
      success: true, 
      tokens_balance: tokensBalance
    });
  } catch (error) {
    console.error('Error getting user token balance:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to get user token balance' 
    });
  }
});

module.exports = router;