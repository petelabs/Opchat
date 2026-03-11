import CryptoJS from 'crypto-js';

/**
 * Simple E2EE utility using AES.
 * In a production app, you'd use RSA/Web Crypto API for key exchange.
 * For this demo, we'll use a shared secret derived from the chatId.
 */

export const encryptMessage = (text: string, secret: string): string => {
  return CryptoJS.AES.encrypt(text, secret).toString();
};

export const decryptMessage = (ciphertext: string, secret: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "[Decryption Error]";
  }
};

export const generateShortId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
