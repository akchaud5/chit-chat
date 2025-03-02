const crypto = require('crypto');

// Generate a random encryption key
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Encrypt data (for signaling and metadata)
const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag
  };
};

// Decrypt data
const decryptData = (encryptedPackage, key) => {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm', 
    Buffer.from(key, 'hex'), 
    Buffer.from(encryptedPackage.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedPackage.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
};

module.exports = { generateEncryptionKey, encryptData, decryptData };