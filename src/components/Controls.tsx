import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Setor } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Trash2, Moon, Sun, Settings, LayoutGrid, Mail, Server, Lock, Variable, Send, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const Controls: React.FC = () => {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [newSetor, setNewSetor] = useState('');
  const { theme, toggleTheme } = useTheme();

  // Email Config State
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    seguranca: 'TLS',
    porta: 587,
    email_envio: '',
    senha: '',
    email_destino: '',
    usar_mesmo_email: false,
    titulo_template: '',
    corpo_template: '',
    gatilhos: [] as string[]
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSetores();
    fetchEmailConfig();
  }, []);

  const fetchSetores = async () => {
    const { data } = await supabase.from('setores').select('*').order('nome');
    if (data) setSetores(data);
  };

  const fetchEmailConfig = async () => {
    setLoadingConfig(true);
    const { data, error } = await supabase
      .from('config_email')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
    
    if (data) {
      setEmailConfig({
        host: data.host || '',
        seguranca: data.seguranca || 'TLS',
        porta: data.porta || 587,
        email_envio: data.email_envio || '',
        senha: data.senha || '',
        email_destino: data.email_destino || '',
        usar_mesmo_email: data.usar_mesmo_email || false,
        titulo_template: data.titulo_template || '',
        corpo_template: data.corpo_template || '',
        gatilhos: data.gatilhos || []
      });
    }
    setLoadingConfig(false);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    const { error } = await supabase
      .from('config_email')
      .update({
        ...emailConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000000');

    if (error) alert('Erro ao salvar configuração: ' + error.message);
    else alert('Configuração salva com sucesso!');
    setSavingConfig(false);
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig)
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ success: false, message: 'Erro de conexão com o servidor.' });
    }
    setTestingEmail(false);
  };

  const handleAddSetor = async () => {
    if (!newSetor.trim()) return;
    const { error } = await supabase.from('setores').insert({ nome: newSetor });
    if (error) alert('Erro ao adicionar setor: ' + error.message);
    else {
      setNewSetor('');
      fetchSetores();
    }
  };

  const handleDeleteSetor = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este setor?')) {
      const { error } = await supabase.from('setores').delete().eq('id', id);
      if (error) alert('Erro ao excluir: ' + error.message);
      else fetchSetores();
    }
  };

  const insertVariable = (variable: string, target: 'title' | 'body') => {
    const varText = `{{${variable}}}`;
    if (target === 'title') {
      const input = titleRef.current;
      if (!input) return;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = emailConfig.titulo_template;
      const newText = text.substring(0, start) + varText + text.substring(end);
      setEmailConfig(prev => ({ ...prev, titulo_template: newText }));
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + varText.length, start + varText.length);
      }, 0);
    } else {
      const textarea = bodyRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const text = emailConfig.corpo_template;
      const newText = text.substring(0, start) + varText + text.substring(end);
      setEmailConfig(prev => ({ ...prev, corpo_template: newText }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varText.length, start + varText.length);
      }, 0);
    }
  };

  const toggleGatilho = (gatilho: string) => {
    setEmailConfig(prev => ({
      ...prev,
      gatilhos: prev.gatilhos.includes(gatilho)
        ? prev.gatilhos.filter(g => g !== gatilho)
        : [...prev.gatilhos, gatilho]
    }));
  };

  const variables = [
    { id: 'id', label: 'ID do Chamado' },
    { id: 'titulo', label: 'Título' },
    { id: 'status', label: 'Status' },
    { id: 'setor', label: 'Setor' },
    { id: 'tipo', label: 'Tipo' },
    { id: 'prioridade', label: 'Prioridade' },
    { id: 'responsavel', label: 'Responsável' },
    { id: 'usuario', label: 'Usuário' },
    { id: 'descricao', label: 'Descrição' },
    { id: 'data_abertura', label: 'Data Abertura' },
    { id: 'data_fechamento', label: 'Data Fechamento' },
  ];

  if (loadingConfig) return <div className="p-12 text-center text-slate-500">Carregando configurações...</div>;

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Controles</h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Email Configuration */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Configuração de E-mail</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">SMTP e Notificações Automáticas</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  {testingEmail ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Teste
                </button>
                <button 
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Salvar
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${testResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {testResult.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span className="text-sm font-bold">{testResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Host SMTP</label>
                <div className="relative">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="ex: smtp.gmail.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold text-sm"
                    value={emailConfig.host}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, host: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Segurança</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold text-sm appearance-none"
                    value={emailConfig.seguranca}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmailConfig(prev => ({ 
                        ...prev, 
                        seguranca: val,
                        porta: val === 'TLS' ? 587 : 465
                      }));
                    }}
                  >
                    <option value="TLS">TLS</option>
                    <option value="SSL">SSL</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Porta</label>
                  <input 
                    type="number" 
                    placeholder="587"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold text-sm"
                    value={emailConfig.porta}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, porta: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Envio</label>
                <input 
                  type="email" 
                  placeholder="ex: suporte@empresa.com"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold text-sm"
                  value={emailConfig.email_envio}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, email_envio: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha / App Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold text-sm"
                    value={emailConfig.senha}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, senha: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Destino</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      checked={emailConfig.usar_mesmo_email}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, usar_mesmo_email: e.target.checked }))}
                    />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Usar o mesmo de envio</span>
                  </label>
                </div>
                <input 
                  type="email" 
                  placeholder="ex: gestor@empresa.com"
                  disabled={emailConfig.usar_mesmo_email}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold text-sm disabled:opacity-50"
                  value={emailConfig.usar_mesmo_email ? emailConfig.email_envio : emailConfig.email_destino}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, email_destino: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600">
                  <LayoutGrid size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Gatilhos de Envio</h4>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {['Ao abrir chamado', 'Ao editar status', 'Ao fechar'].map(gatilho => (
                  <label key={gatilho} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-blue-500 transition-all group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      checked={emailConfig.gatilhos.includes(gatilho)}
                      onChange={() => toggleGatilho(gatilho)}
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600">{gatilho}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600">
                    <Variable size={20} />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Template da Mensagem</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variables.map(v => (
                    <button 
                      key={v.id}
                      onClick={() => insertVariable(v.id, 'body')}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 rounded-lg transition-all border border-slate-200 dark:border-slate-700"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do E-mail</label>
                  <input 
                    ref={titleRef}
                    type="text" 
                    placeholder="ex: Novo Chamado Aberto: {{id}} - {{titulo}}"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold text-sm"
                    value={emailConfig.titulo_template}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, titulo_template: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Corpo do E-mail</label>
                  <textarea 
                    ref={bodyRef}
                    rows={8}
                    placeholder="Olá, um novo chamado foi registrado no sistema.&#10;&#10;ID: {{id}}&#10;Título: {{titulo}}&#10;Setor: {{setor}}&#10;Descrição: {{descricao}}"
                    className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-medium text-sm resize-none"
                    value={emailConfig.corpo_template}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, corpo_template: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Theme Control */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Aparência</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Personalize sua interface</p>
              </div>
            </div>
            
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl transition-colors ${theme === 'light' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                  {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                <span className="font-black text-sm text-slate-700 dark:text-slate-200 uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                  Modo {theme === 'light' ? 'Claro' : 'Escuro'}
                </span>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300 dark:bg-blue-600 transition-colors">
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </button>
          </div>

          {/* Sectors Control */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600">
                <LayoutGrid size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Setores</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Organize seus chamados</p>
              </div>
            </div>

            <div className="flex gap-3 mb-8">
              <input 
                type="text" 
                placeholder="Novo setor..." 
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white font-bold text-sm"
                value={newSetor}
                onChange={(e) => setNewSetor(e.target.value)}
              />
              <button 
                onClick={handleAddSetor}
                className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {setores.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group hover:border-emerald-200 dark:hover:border-emerald-900 transition-all">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{s.nome}</span>
                  <button 
                    onClick={() => handleDeleteSetor(s.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {setores.length === 0 && <p className="text-center text-slate-500 py-8 font-medium">Nenhum setor cadastrado.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
