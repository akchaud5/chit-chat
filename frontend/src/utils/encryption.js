/**
 * Client-side encryption utilities for securing call signaling and messages
 */

// Convert string to ArrayBuffer for encryption
const str2ab = (str) => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

// Convert ArrayBuffer to string after decryption
const ab2str = (buf) => {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
};

// Generate an encryption key pair for asymmetric encryption
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  
  return keyPair;
};

// Export public key in format suitable for transmission
export const exportPublicKey = async (keyPair) => {
  const exported = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  return window.btoa(ab2str(exported));
};

// Import a public key from another peer
export const importPublicKey = async (publicKeyString) => {
  const binaryDerString = window.atob(publicKeyString);
  const binaryDer = str2ab(binaryDerString);
  
  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
};

// Encrypt data with someone's public key (asymmetric)
export const encryptWithPublicKey = async (data, publicKey) => {
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    encoded
  );
  
  return window.btoa(ab2str(encrypted));
};

// Decrypt data with your private key (asymmetric)
export const decryptWithPrivateKey = async (encryptedData, privateKey) => {
  const binaryString = window.atob(encryptedData);
  const binaryData = str2ab(binaryString);
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    binaryData
  );
  
  return JSON.parse(new TextDecoder().decode(decrypted));
};

// --- Symmetric encryption for messages ---

// Generate a random encryption key for symmetric encryption (AES-GCM)
export const generateMessageKey = async () => {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
};

// Export symmetric key for secure storage
export const exportSymmetricKey = async (key) => {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return window.btoa(ab2str(exported));
};

// Import symmetric key from storage
export const importSymmetricKey = async (keyString) => {
  const binaryString = window.atob(keyString);
  const binaryKey = str2ab(binaryString);
  
  return window.crypto.subtle.importKey(
    "raw",
    binaryKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
};

// Encrypt message with symmetric key - used for chat messages
export const encryptMessage = async (message, key) => {
  // Create initialization vector
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);
  
  // Encrypt the message
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoded
  );
  
  // Combine IV and encrypted data
  return {
    iv: window.btoa(ab2str(iv.buffer)),
    encryptedData: window.btoa(ab2str(encrypted))
  };
};

// Decrypt message with symmetric key
export const decryptMessage = async (encryptedPackage, key) => {
  const iv = str2ab(window.atob(encryptedPackage.iv));
  const encryptedData = str2ab(window.atob(encryptedPackage.encryptedData));
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    key,
    encryptedData
  );
  
  return new TextDecoder().decode(decrypted);
};

// Generate and encrypt per-chat symmetric key using recipient's public key
export const createEncryptedChatKey = async (publicKey) => {
  // Create a symmetric key for this chat
  const chatKey = await generateMessageKey();
  
  // Export the key to raw format
  const exportedKey = await exportSymmetricKey(chatKey);
  
  // Encrypt it with recipient's public key
  const encryptedKey = await encryptWithPublicKey(exportedKey, publicKey);
  
  return {
    chatKey,        // For local use
    encryptedKey    // To send to recipient
  };
};

// Setup secure messaging between users
export const setupSecureMessaging = async (myKeyPair, theirPublicKeyString) => {
  // Import their public key
  const theirPublicKey = await importPublicKey(theirPublicKeyString);
  
  // Create and encrypt a symmetric key for this chat
  const { chatKey, encryptedKey } = await createEncryptedChatKey(theirPublicKey);
  
  return {
    chatKey,      // Store locally for encrypting/decrypting messages
    encryptedKey  // Send to the other user so they can decrypt messages
  };
};