import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from "nodemailer";
import { supabase, decrypt } from "../_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    console.log("Recebendo pedido de teste de e-mail (Vercel):", JSON.stringify(req.body));
    let { host, porta, seguranca, email_envio, senha, email_destino, usar_mesmo_email } = req.body;
    
    if (senha === "********") {
      console.log("Buscando senha no banco de dados...");
      const { data, error: fetchError } = await supabase.from('config_email').select('senha').single();
      if (fetchError || !data) {
        console.error("Erro ao buscar senha:", fetchError);
        throw new Error("Não foi possível carregar a senha do banco de dados. Salve as configurações novamente.");
      }
      senha = decrypt(data.senha);
      console.log("Senha descriptografada com sucesso.");
    }

    if (!senha) {
      throw new Error("Senha não fornecida ou não encontrada.");
    }

    const recipient = usar_mesmo_email ? email_envio : email_destino;

    const transporter = nodemailer.createTransport({
      host,
      port: porta,
      secure: seguranca === 'SSL',
      auth: {
        user: email_envio,
        pass: senha,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      authMethod: 'LOGIN',
      name: email_envio.split('@')[1] || 'localhost',
      debug: true,
      logger: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    console.log(`Tentando enviar e-mail de teste para: ${recipient}`);
    
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
    
    return res.json({ success: true, message: "E-mail de teste enviado com sucesso!" });
  } catch (error: any) {
    console.error("Erro detalhado no SMTP (Vercel):", error);
    let friendlyMessage = error.message || "Erro desconhecido no servidor";
    
    if (error.responseCode === 535) {
      friendlyMessage = "Usuário ou senha incorretos (Erro 535). Verifique se o e-mail completo está correto e se a senha não possui caracteres especiais incompatíveis.";
    } else if (error.code === 'ETIMEDOUT') {
      friendlyMessage = "Tempo de conexão esgotado. Verifique o host e a porta.";
    } else if (error.code === 'ECONNREFUSED') {
      friendlyMessage = "Conexão recusada pelo servidor SMTP.";
    } else if (error.response) {
      friendlyMessage = `Erro do servidor SMTP: ${error.response}`;
    } else if (error.code) {
      friendlyMessage = `Erro de conexão (${error.code}): ${error.message}`;
    }
    
    return res.status(500).json({ success: false, message: friendlyMessage });
  }
}
