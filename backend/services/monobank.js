const axios = require('axios');
const config = require('../config');
const database = require('../database/database');

class MonobankService {
  constructor() {
    this.apiUrl = 'https://api.monobank.ua';
    this.token = config.MONOBANK_TOKEN;
    this.accountId = config.MONOBANK_ACCOUNT_ID;
    this.cardNumber = config.MONOBANK_CARD_NUMBER;
  }

  // Get account statement from Monobank (card transactions)
  async getAccountStatement() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/personal/statement/${this.accountId}/${Math.floor(Date.now() / 1000) - 3600}`, // Last hour
        {
          headers: {
            'X-Token': this.token
          },
          timeout: 10000
        }
      );

      return response.data || [];
    } catch (error) {
      console.error('Error fetching account statement:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return [];
    }
  }

  // Get jar transactions from Monobank
  async getJarTransactions() {
    try {
      console.log('🔍 Fetching jar transactions...');
      console.log('Jar ID:', config.MONOBANK_JAR_ID);
      
      const response = await axios.get(
        `${this.apiUrl}/jar/${config.MONOBANK_JAR_ID}/transactions`,
        {
          headers: {
            'X-Token': this.token
          },
          timeout: 10000
        }
      );

      console.log('Jar transactions received:', response.data?.length || 0);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching jar transactions:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return [];
    }
  }

  // Check for pending payments
  async checkPendingPayments() {
    try {
      console.log('🔍 Checking for pending payments...');
      
      // Get pending payments from database
      const pendingPayments = await database.getPendingPayments();
      
      if (pendingPayments.length === 0) {
        console.log('No pending payments found');
        return;
      }

      console.log(`Found ${pendingPayments.length} pending payments`);

      // Get recent transactions from Monobank Jar
      const jarTransactions = await this.getJarTransactions();
      
      if (jarTransactions.length === 0) {
        console.log('No recent jar transactions found');
        return;
      }

      console.log(`Found ${jarTransactions.length} recent jar transactions`);

      // Save all jar transactions to database
      for (const transaction of jarTransactions) {
        await database.saveTransaction({
          monobank_id: transaction.id,
          amount: transaction.amount,
          description: transaction.description || '',
          time: transaction.time
        });
      }

      // Check for matching payments
      await this.matchPaymentsWithTransactions(pendingPayments, jarTransactions);

    } catch (error) {
      console.error('Error checking pending payments:', error);
    }
  }

  // Match payments with transactions
  async matchPaymentsWithTransactions(pendingPayments, transactions) {
    for (const payment of pendingPayments) {
      const matchingTransaction = this.findMatchingTransaction(payment, transactions);
      
      if (matchingTransaction) {
        console.log(`✅ Found matching transaction for payment ${payment.payment_code}`);
        
        // Update payment status
        await database.updatePaymentStatus(
          payment.payment_code, 
          'completed', 
          matchingTransaction.id
        );

        // Mark transaction as processed
        await database.markTransactionProcessed(
          matchingTransaction.id, 
          payment.payment_code
        );

        // Add tokens to user balance
        await this.addTokensFromPayment(payment);

        console.log(`🎉 Payment ${payment.payment_code} processed successfully!`);
      }
    }
  }

  // Find matching transaction for a payment
  findMatchingTransaction(payment, transactions) {
    const paymentAmount = payment.price; // Виправлено: використовуємо price замість amount
    const paymentCode = payment.payment_code;
    
    console.log(`🔍 Looking for payment: ${paymentCode}, amount: ${paymentAmount} грн`);

    return transactions.find(transaction => {
      // Convert price to kopecks (Monobank returns amount in kopecks)
      const expectedAmountInKopecks = paymentAmount * 100; // price is in UAH, convert to kopecks
      const amountMatches = Math.abs(transaction.amount) === expectedAmountInKopecks;
      
      // Check if description содержит payment code
      const descriptionMatches = transaction.description && 
        transaction.description.includes(paymentCode);

      // Check if transaction is recent (within last hour)
      const isRecent = (Date.now() / 1000) - transaction.time < 3600;

      console.log(`  💰 Transaction ${transaction.id}:`);
      console.log(`    - Amount: ${transaction.amount} коп (${transaction.amount / 100} грн)`);
      console.log(`    - Expected: ${expectedAmountInKopecks} коп (${paymentAmount} грн)`);
      console.log(`    - Description: "${transaction.description}"`);
      console.log(`    - Amount matches: ${amountMatches}`);
      console.log(`    - Description matches: ${descriptionMatches}`);
      console.log(`    - Is recent: ${isRecent}`);

      return amountMatches && descriptionMatches && isRecent;
    });
  }

  // Add tokens from payment
  async addTokensFromPayment(payment) {
    try {
      // Get current user tokens
      let currentTokens = 20; // default tokens
      
      if (payment.user_id && payment.user_id !== 'anonymous') {
        const userTokenBalance = await database.getUserTokenBalance(payment.user_id);
        currentTokens = userTokenBalance || 20;
      }
      
      // Add purchased tokens
      const tokensToAdd = payment.tokens || 0;
      const newTokenBalance = currentTokens + tokensToAdd;
      
      console.log(`💰 Token balance update:`);
      console.log(`  - Current balance: ${currentTokens}`);
      console.log(`  - Tokens to add: ${tokensToAdd}`);
      console.log(`  - Current payment: ${payment.id}`);
      console.log(`  - New balance: ${newTokenBalance}`);
      
      // Update user tokens balance in database
      if (payment.user_id && payment.user_id !== 'anonymous') {
        await database.addTokensToUser(payment.user_id, tokensToAdd);
        console.log(`✅ Added ${tokensToAdd} tokens to user ${payment.user_id}. New balance: ${newTokenBalance}`);
      } else {
        console.log('⚠️ Anonymous payment - tokens will be added when user registers');
      }
      
    } catch (error) {
      console.error('Error adding tokens from payment:', error);
    }
  }

  // Get payment status
  async getPaymentStatus(paymentCode) {
    try {
      const payment = await database.getPaymentByCode(paymentCode);
      
      if (!payment) {
        return { status: 'not_found', message: 'Payment not found' };
      }

      if (payment.status === 'completed') {
        return { 
          status: 'completed', 
          message: 'Payment confirmed',
          completed_at: payment.completed_at
        };
      }

      if (payment.status === 'expired') {
        return { status: 'expired', message: 'Payment expired' };
      }

      return { status: 'pending', message: 'Payment pending' };

    } catch (error) {
      console.error('Error getting payment status:', error);
      return { status: 'error', message: 'Internal server error' };
    }
  }

  // Clean up expired payments
  async cleanupExpiredPayments() {
    try {
      const sql = `
        UPDATE payments 
        SET status = 'expired' 
        WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP
      `;
      
      // This would need to be implemented in database.js
      console.log('🧹 Cleaning up expired payments...');
      
    } catch (error) {
      console.error('Error cleaning up expired payments:', error);
    }
  }
}

module.exports = new MonobankService();
