import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, encrypt } from "../_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const config = req.body;
    
    // Criptografar a senha antes de salvar se ela não for a máscara
    if (config.senha && config.senha !== "********") {
      config.senha = encrypt(config.senha);
    } else if (config.senha === "********") {
      // Se for a máscara, removemos do objeto para não sobrescrever com asteriscos
      delete config.senha;
    }

    const { error } = await supabase
      .from('config_email')
      .upsert({
        id: '00000000-0000-0000-0000-000000000000',
        ...config,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao salvar config (Vercel):", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno ao salvar configuração." });
  }
}
