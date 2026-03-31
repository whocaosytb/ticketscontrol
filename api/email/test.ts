import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from "nodemailer";
import { supabase, decrypt } from "../_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  console.log("Recebendo pedido de teste de e-mail (Vercel):", req.body);
  let { host, porta, seguranca, email_envio, senha, email_destino, usar_mesmo_email } = req.body;
  
  if (senha === "********") {
    const { data } = await supabase.from('config_email').select('senha').single();
    senha = decrypt(data?.senha);
  }

  const recipient = usar_mesmo_email ? email_envio : email_destino;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: porta,
      secure: seguranca === 'SSL',
      auth: {
        user: email_envio,
        pass: senha,
      },
      tls: {
        rejectUnauthorized: false
      },
      authMethod: 'LOGIN',
      name: 'solubyte.com.br'
    });

    await transporter.verify();
    
    await transporter.sendMail({
      from: `"${email_envio.split('@')[0]}" <${email_envio}>`,
      to: recipient,
      subject: "Teste de Configuração de E-mail",
      text: "Este é um e-mail de teste para validar as configurações do sistema de chamados.",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Teste de Configuração</h2>
          <p>Este é um e-mail de teste para validar as configurações do sistema de chamados.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Enviado via SMTP: ${host}</p>
        </div>
      `,
    });
    
    res.json({ success: true, message: "E-mail de teste enviado com sucesso!" });
  } catch (error: any) {
    console.error("Erro detalhado no SMTP (Vercel):", error);
    let friendlyMessage = error.message;
    if (error.responseCode === 535) {
      friendlyMessage = "Usuário ou senha incorretos (Erro 535).";
    }
    res.status(500).json({ success: false, message: friendlyMessage });
  }
}
