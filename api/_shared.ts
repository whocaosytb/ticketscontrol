import { createClient } from "@supabase/supabase-js";
import * as crypto from "node:crypto";
import { Buffer } from "node:buffer";

console.log("api/_shared.ts carregado");

// Chave de criptografia (Deve ter 32 caracteres)
const DEFAULT_KEY = "solubyte-secret-key-32-chars-!!!";
let rawKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY;

// Garantir que a chave tenha exatamente 32 caracteres para o AES-256
if (rawKey.length < 32) {
  rawKey = rawKey.padEnd(32, '0');
} else if (rawKey.length > 32) {
  rawKey = rawKey.substring(0, 32);
}

export const ENCRYPTION_KEY = rawKey;
const IV_LENGTH = 16;

export function encrypt(text: string) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error("Erro ao criptografar:", error);
    return text;
  }
}

export function decrypt(text: string) {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Erro ao descriptografar:", error);
    return text;
  }
}

const supabaseUrl = 'https://fmhfoneisisggubgbvtp.supabase.co';
const supabaseKey = 'sb_publishable_KUJWYmBtooMeEMFYe8Eo7w_LcO8VRPf';
export const supabase = createClient(supabaseUrl, supabaseKey);
