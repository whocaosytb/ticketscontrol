import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://fmhfoneisisggubgbvtp.supabase.co';
const supabaseKey = 'sb_publishable_KUJWYmBtooMeEMFYe8Eo7w_LcO8VRPf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/email/test", async (req, res) => {
    const { host, porta, seguranca, email_envio, senha, email_destino, usar_mesmo_email } = req.body;
    
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
      });

      await transporter.sendMail({
        from: email_envio,
        to: recipient,
        subject: "Teste de Configuração de E-mail",
        text: "Este é um e-mail de teste para validar as configurações do sistema de chamados.",
        html: "<p>Este é um e-mail de teste para validar as configurações do sistema de chamados.</p>",
      });

      res.json({ success: true, message: "E-mail de teste enviado com sucesso!" });
    } catch (error: any) {
      console.error("Erro no teste de e-mail:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/email/send-event", async (req, res) => {
    const { ticketId, eventType } = req.body;

    try {
      // 1. Fetch Config
      const { data: config, error: configError } = await supabase
        .from('config_email')
        .select('*')
        .single();

      if (configError || !config) {
        return res.status(404).json({ success: false, message: "Configuração de e-mail não encontrada." });
      }

      // 2. Check Triggers
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
      });

      await transporter.sendMail({
        from: config.email_envio,
        to: recipient,
        subject: title,
        text: body.replace(/<[^>]*>?/gm, ''), // Basic strip HTML for text version
        html: body.replace(/\n/g, '<br>'), // Simple newline to br for HTML
      });

      res.json({ success: true, message: "E-mail enviado com sucesso!" });
    } catch (error: any) {
      console.error("Erro ao enviar e-mail de evento:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
