import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "solubyte-secret-key-32-chars-!!!"; 
const IV_LENGTH = 16;

function decrypt(text: string) {
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

const encrypted = "9d4aa38e51a42fc30a37c7b05e7612ce:430c72c2d92b38560b76cd60cc535262";
const decrypted = decrypt(encrypted);
console.log("Senha descriptografada:", decrypted);
