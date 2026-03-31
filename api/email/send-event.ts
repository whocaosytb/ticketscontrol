import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from "nodemailer";
import { supabase, decrypt } from "../_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { ticketId, eventType } = req.body;

    // 1. Fetch Config
    const { data: config, error: configError } = await supabase
      .from('config_email')
      .select('*')
      .single();

    if (configError || !config) {
      return res.status(404).json({ success: false, message: "Configuração de e-mail não encontrada." });
    }

    // Descriptografar a senha para uso interno
    config.senha = decrypt(config.senha);
    if (!config.senha) {
      return res.status(500).json({ success: false, message: "Erro ao descriptografar a senha do e-mail." });
    }

    const triggers = config.gatilhos || [];
    const eventMap: Record<string, string> = {
      'abertura': 'Ao abrir chamado',
      'status': 'Ao editar status',
      'fechamento': 'Ao fechar'
    };

    if (!triggers.includes(eventMap[eventType])) {
      return res.json({ success: true, message: "Gatilho não habilitado para este evento." });
    }

    // 3. Fetch Ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('chamados')
      .select('*, setores(nome)')
      .eq('uuid', ticketId)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ success: false, message: "Chamado não encontrado." });
    }

    // 4. Prepare Email
    let title = config.titulo_template || "";
    let body = config.corpo_template || "";

    const variables: Record<string, any> = {
      id: ticket.id_visual,
      titulo: ticket.titulo,
      status: ticket.status,
      setor: ticket.setores?.nome || 'N/A',
      tipo: ticket.tipo,
      prioridade: ticket.prioridade,
      responsavel: ticket.responsavel || 'N/A',
      usuario: ticket.usuario_solicitante,
      descricao: ticket.descricao,
      data_abertura: ticket.data_abertura,
      data_fechamento: ticket.data_fechamento || 'N/A'
    };

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(regex, String(value));
      body = body.replace(regex, String(value));
    });

    const recipient = config.usar_mesmo_email ? config.email_envio : config.email_destino;

    // 5. Send Email
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.porta,
      secure: config.seguranca === 'SSL',
      auth: {
        user: config.email_envio,
        pass: config.senha,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      authMethod: 'LOGIN',
      name: config.email_envio.split('@')[1] || 'localhost',
      debug: true,
      logger: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    console.log("Tentando enviar e-mail de evento para (Vercel):", recipient);
    await transporter.sendMail({
      from: `"${config.email_envio.split('@')[0]}" <${config.email_envio}>`,
      to: recipient,
      subject: title,
      text: body.replace(/<[^>]*>?/gm, ''), // Basic strip HTML for text version
      html: body.replace(/\n/g, '<br>'), // Simple newline to br for HTML
    });
    console.log("E-mail de evento enviado com sucesso! (Vercel)");

    return res.json({ success: true, message: "E-mail enviado com sucesso!" });
  } catch (error: any) {
    console.error("Erro ao enviar e-mail de evento (Vercel):", error);
    let friendlyMessage = error.message || "Erro interno ao enviar e-mail.";
    
    if (error.responseCode === 535) {
      friendlyMessage = "Erro 535: Falha na autenticação SMTP. Verifique usuário e senha.";
    } else if (error.code === 'ETIMEDOUT') {
      friendlyMessage = "Timeout na conexão com o servidor SMTP.";
    } else if (error.code === 'ECONNREFUSED') {
      friendlyMessage = "Conexão SMTP recusada.";
    } else if (error.response) {
      friendlyMessage = `Erro SMTP: ${error.response}`;
    }
    
    return res.status(500).json({ success: false, message: friendlyMessage });
  }
}
