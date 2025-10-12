const express = require('express');
const database = require('../database/database');
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

// Register user
router.post('/register', validateApiKey, async (req, res) => {
  try {
    const { user_id, user_agent, language, platform, timestamp, tokens_balance } = req.body;

    // Validate input
    if (!user_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'user_id is required'
      });
    }

    const userData = {
      user_id,
      user_agent: user_agent || null,
      language: language || null,
      platform: platform || null,
      tokens_balance: tokens_balance || 20
    };

    const result = await database.registerUser(userData);

    res.json({
      success: true,
      message: result.created ? 'User registered successfully' : 'User updated successfully',
      user: result
    });

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
});

// Get user info
router.get('/:user_id', validateApiKey, async (req, res) => {
  try {
    const { user_id } = req.params;

    const user = await database.getUserById(user_id);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user'
    });
  }
});

// Update user requests count
router.post('/:user_id/requests', validateApiKey, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { increment = 1 } = req.body;

    const result = await database.updateUserRequests(user_id, increment);

    res.json({
      success: true,
      message: 'User requests updated',
      changes: result.changes
    });

  } catch (error) {
    console.error('Error updating user requests:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user requests'
    });
  }
});

// Update user tokens
router.post('/:user_id/tokens', validateApiKey, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { tokens } = req.body;

    if (typeof tokens !== 'number') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'tokens must be a number'
      });
    }

    const result = await database.updateUserTokens(user_id, tokens);

    res.json({
      success: true,
      message: 'User tokens updated',
      tokens: tokens
    });

  } catch (error) {
    console.error('Error updating user tokens:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user tokens'
    });
  }
});

module.exports = router;

