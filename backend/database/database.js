const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Ensure database directory exists
      const dbDir = path.dirname(config.DATABASE_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(config.DATABASE_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createPaymentsTable = `
        DROP TABLE IF EXISTS payments;
        CREATE TABLE payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          payment_code TEXT UNIQUE NOT NULL,
          user_id TEXT NOT NULL,
          tokens INTEGER NOT NULL,
          price REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME NULL
        )
      `;

      const createTransactionsTable = `
        DROP TABLE IF EXISTS transactions;
        CREATE TABLE transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          monobank_id TEXT UNIQUE NOT NULL,
          amount INTEGER NOT NULL,
          description TEXT NOT NULL,
          time INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          payment_code TEXT NULL,
          processed BOOLEAN DEFAULT FALSE
        )
      `;

      const createSubscriptionsTable = `
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          plan_type TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          payment_code TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createFriendCodesTable = `
        CREATE TABLE IF NOT EXISTS friend_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          tokens_amount INTEGER NOT NULL DEFAULT 500,
          max_uses INTEGER NOT NULL DEFAULT 1,
          current_uses INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NULL
        )
      `;

      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          user_agent TEXT,
          language TEXT,
          platform TEXT,
          first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          total_requests INTEGER DEFAULT 0,
          tokens_balance INTEGER DEFAULT 20,
          subscription_status TEXT DEFAULT 'basic'
        )
      `;

      this.db.exec(createPaymentsTable, (err) => {
        if (err) {
          console.error('Error creating payments table:', err);
          reject(err);
          return;
        }

        this.db.exec(createTransactionsTable, (err) => {
          if (err) {
            console.error('Error creating transactions table:', err);
            reject(err);
            return;
          }

          this.db.exec(createSubscriptionsTable, (err) => {
            if (err) {
              console.error('Error creating subscriptions table:', err);
              reject(err);
              return;
            }

            this.db.exec(createFriendCodesTable, (err) => {
              if (err) {
                console.error('Error creating friend_codes table:', err);
                reject(err);
                return;
              }

              this.db.exec(createUsersTable, (err) => {
                if (err) {
                  console.error('Error creating users table:', err);
                  reject(err);
                  return;
                }

                console.log('Database tables created successfully');
                resolve();
              });
            });
          });
        });
      });
    });
  }

  // Payment methods
  async createPayment(paymentData) {
    return new Promise((resolve, reject) => {
      const { payment_code, user_id, tokens, price } = paymentData;
      
      const sql = `
        INSERT INTO payments (payment_code, user_id, tokens, price)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [payment_code, user_id, tokens, price], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, payment_code, user_id, tokens, price });
        }
      });
    });
  }

  async getPaymentByCode(payment_code) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM payments WHERE payment_code = ?';
      
      this.db.get(sql, [payment_code], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updatePaymentStatus(payment_code, status, transaction_id = null) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE payments 
        SET status = ?, completed_at = CURRENT_TIMESTAMP
        WHERE payment_code = ?
      `;
      
      this.db.run(sql, [status, payment_code], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async getPendingPayments() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM payments 
        WHERE status = 'pending'
        ORDER BY created_at DESC
      `;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Transaction methods
  async saveTransaction(transactionData) {
    return new Promise((resolve, reject) => {
      const { monobank_id, amount, description, time } = transactionData;
      
      const sql = `
        INSERT OR IGNORE INTO transactions (monobank_id, amount, description, time)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [monobank_id, amount, description, time], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...transactionData });
        }
      });
    });
  }

  async getUnprocessedTransactions() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM transactions WHERE processed = FALSE ORDER BY time DESC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async markTransactionProcessed(monobank_id, payment_code) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE transactions 
        SET processed = TRUE, payment_code = ?
        WHERE monobank_id = ?
      `;
      
      this.db.run(sql, [payment_code, monobank_id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Subscription methods
  async createSubscription(subscriptionData) {
    return new Promise((resolve, reject) => {
      const { user_id, plan_type, start_date, end_date, payment_code } = subscriptionData;
      
      const sql = `
        INSERT INTO subscriptions (user_id, plan_type, start_date, end_date, payment_code)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [user_id, plan_type, start_date, end_date, payment_code], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...subscriptionData });
        }
      });
    });
  }

  async getUserSubscription(user_id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM subscriptions 
        WHERE user_id = ? AND status = 'active' AND end_date > CURRENT_TIMESTAMP
        ORDER BY created_at DESC LIMIT 1
      `;
      
      this.db.get(sql, [user_id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // User methods
  async registerUser(userData) {
    return new Promise((resolve, reject) => {
      const { user_id, user_agent, language, platform, tokens_balance } = userData;
      
      // Check if user already exists
      const checkSql = 'SELECT * FROM users WHERE user_id = ?';
      this.db.get(checkSql, [user_id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          // User exists, update last_seen
          const updateSql = 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE user_id = ?';
          this.db.run(updateSql, [user_id], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: row.id, ...row, updated: true });
            }
          });
        } else {
          // New user, insert
          const insertSql = `
            INSERT INTO users (user_id, user_agent, language, platform, tokens_balance)
            VALUES (?, ?, ?, ?, ?)
          `;
          this.db.run(insertSql, [user_id, user_agent, language, platform, tokens_balance || 20], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: this.lastID, user_id, user_agent, language, platform, tokens_balance: tokens_balance || 20, created: true });
            }
          });
        }
      });
    });
  }

  async getUserById(user_id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE user_id = ?';
      
      this.db.get(sql, [user_id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateUserRequests(user_id, increment = 1) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET total_requests = total_requests + ?, last_seen = CURRENT_TIMESTAMP WHERE user_id = ?';
      
      this.db.run(sql, [increment, user_id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Add tokens to user's balance
  async addTokensToUser(user_id, tokens) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users 
        SET tokens_balance = tokens_balance + ?, 
            last_seen = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `;
      
      this.db.run(sql, [tokens, user_id], function(err) {
        if (err) {
          console.error('Error adding tokens to user:', err);
          reject(err);
        } else {
          console.log(`Added ${tokens} tokens to user ${user_id}`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Update user's token balance (set absolute value)
  async updateUserTokens(user_id, tokens) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users 
        SET tokens_balance = ?, 
            last_seen = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `;
      
      this.db.run(sql, [tokens, user_id], function(err) {
        if (err) {
          console.error('Error updating user tokens:', err);
          reject(err);
        } else {
          console.log(`Updated tokens to ${tokens} for user ${user_id}`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Get user's token balance
  async getUserTokenBalance(user_id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT tokens_balance FROM users WHERE user_id = ?';
      
      this.db.get(sql, [user_id], (err, row) => {
        if (err) {
          console.error('Error getting user token balance:', err);
          reject(err);
        } else {
          resolve(row ? row.tokens_balance : 0);
        }
      });
    });
  }

  // Deduct tokens from user's balance
  async deductTokensFromUser(user_id, tokens) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users 
        SET tokens_balance = tokens_balance - ?, 
            last_seen = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND tokens_balance >= ?
      `;
      
      this.db.run(sql, [tokens, user_id, tokens], function(err) {
        if (err) {
          console.error('Error deducting tokens from user:', err);
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('Insufficient tokens'));
        } else {
          console.log(`Deducted ${tokens} tokens from user ${user_id}`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Friend codes methods
  async validateFriendCode(code) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM friend_codes 
        WHERE code = ? AND is_active = 1 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND current_uses < max_uses
      `;
      
      this.db.get(sql, [code.toUpperCase()], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async useFriendCode(code, userId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // Check and update friend code
        const updateCodeSql = `
          UPDATE friend_codes 
          SET current_uses = current_uses + 1 
          WHERE code = ? AND is_active = 1 
          AND current_uses < max_uses
        `;
        
        this.db.run(updateCodeSql, [code.toUpperCase()], function(err) {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          if (this.changes === 0) {
            this.db.run('ROLLBACK');
            reject(new Error('Code not found or already used'));
            return;
          }
          
          // Get tokens amount
          const getTokensSql = 'SELECT tokens_amount FROM friend_codes WHERE code = ?';
          this.db.get(getTokensSql, [code.toUpperCase()], (err, row) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            // Update user tokens
            const updateUserSql = 'UPDATE users SET tokens_balance = tokens_balance + ? WHERE user_id = ?';
            this.db.run(updateUserSql, [row.tokens_amount, userId], function(err) {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              this.db.run('COMMIT');
              resolve({
                success: true,
                tokens_added: row.tokens_amount,
                code: code.toUpperCase()
              });
            });
          });
        });
      });
    });
  }

  // Create friend code
  async createFriendCode(code, tokens_amount, max_uses, expires_at) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO friend_codes (code, tokens_amount, max_uses, expires_at)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [code, tokens_amount, max_uses, expires_at], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, code, tokens_amount, max_uses, expires_at });
        }
      });
    });
  }

  // Initialize friend codes
  async initializeFriendCodes() {
    const codes = [
      'FRIENDS500', 'VIP500', 'SPECIAL500', 'BONUS500', 'GIFT500',
      'TEAM500', 'CREW500', 'SQUAD500', 'GROUP500', 'CLAN500',
      'ELITE500', 'PRO500', 'MASTER500', 'BOSS500', 'KING500',
      'LEGEND500', 'HERO500', 'STAR500', 'GOLD500', 'DIAMOND500'
    ];
    
    for (const code of codes) {
      try {
        await this.createFriendCode(code, 500, 1, null);
        console.log(`Created friend code: ${code}`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`Friend code ${code} already exists`);
        } else {
          console.error(`Error creating friend code ${code}:`, error);
        }
      }
    }
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = new Database();
