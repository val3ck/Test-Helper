// Configuration file
// Copy from config.example.js and fill in your actual values

// Decode function for encoded values
function decodeValue(encodedValue) {
  try {
    return Buffer.from(encodedValue, 'base64').toString('utf8');
  } catch (error) {
    console.error('Failed to decode value:', error);
    return encodedValue; // Return original if decoding fails
  }
}

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Monobank Configuration (encoded)
  MONOBANK_TOKEN: process.env.MONOBANK_TOKEN || decodeValue('dXZIT3NEYjZXYjI1WDhfMEg2OWJFeXljS0dxZHJDalV6Q29mZDJucm8wMUU='),
  MONOBANK_ACCOUNT_ID: parseInt(process.env.MONOBANK_ACCOUNT_ID) || 0,
  MONOBANK_JAR_ID: process.env.MONOBANK_JAR_ID || decodeValue('eThuS096ZVhiUThUdHl1VVJlWHpxbktvTzJWYUZXZw=='),
  MONOBANK_JAR_URL: process.env.MONOBANK_JAR_URL || 'https://send.monobank.ua/jar/5jNh12Sjnw',

  // Database Configuration
  DATABASE_PATH: process.env.DATABASE_PATH || './database/payments.db',

  // Security (encoded)
  JWT_SECRET: process.env.JWT_SECRET || decodeValue('YWlfYXNzaXN0YW50X2p3dF9zZWNyZXRfMjAyNA=='),
  API_KEY: process.env.API_KEY || decodeValue('YWlfYXNzaXN0YW50X2FwaV9rZXlfMjAyNA=='),

  // Payment Configuration
  PAYMENT_CHECK_INTERVAL: parseInt(process.env.PAYMENT_CHECK_INTERVAL) || 30000, // 30 seconds
  PAYMENT_TIMEOUT: parseInt(process.env.PAYMENT_TIMEOUT) || 3600000, // 1 hour
};
