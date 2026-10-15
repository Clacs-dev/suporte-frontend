import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mensagensAPI } from '../../services/api';
import {
  MessageSquare,
  Send,
  Inbox,
  Mail,
  User,
  ChevronLeft,
  Loader,
  CheckCheck,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

interface Contacto {
  id: string;
  nome: string;
  email: string;
  perfil: string;
}

interface Mensagem {
  id: string;
  remetenteId: string;
  destinatarioId: string;
  assunto?: string;
  conteudo: string;
  lida: boolean;
  dataCriacao: string;
  remetenteNome?: string;
  destinatarioNome?: string;
}

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Administração',
  tecnico: 'Técnico',
  cliente: 'Cliente',
};

const iniciais = (nome?: string) =>
  (nome || '?')
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export default function Mensagens() {
  const [caixa, setCaixa] = useState<'entrada' | 'saida'>('entrada');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [euId, setEuId] = useState<string>('');
  const [meuPerfil, setMeuPerfil] = useState<string>('');
  const [naoLidas, setNaoLidas] = useState(0);

  const [formAberto, setFormAberto] = useState(false);
  const [destinatarioId, setDestinatarioId] = useState('');
  const [assunto, setAssunto] = useState('');
  const [conteudo, setConteudo] = useState('');

  const [busca, setBusca] = useState('');
  const [conversaCom, setConversaCom] = useState<Contacto | null>(null);
  const [conversaMsgs, setConversaMsgs] = useState<Mensagem[]>([]);
  const [textoConversa, setTextoConversa] = useState('');
  const [aEnviarConversa, setAEnviarConversa] = useState(false);

  const fimConversa = useRef<HTMLDivElement | null>(null);

  const perfilGuardado = localStorage.getItem('userType') || localStorage.getItem('tipo') || '';

  // ---------------------------------------------------------------- carregar
  const carregarContactos = useCallback(async () => {
    try {
      const res = await mensagensAPI.contactos();
      if (res.success) setContactos(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const carregarCaixa = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mensagensAPI.listar(caixa);
      if (res.success) setMensagens(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [caixa]);

  const carregarNaoLidas = useCallback(async () => {
    try {
      const res = await mensagensAPI.naoLidas();
      if (res.success) setNaoLidas(res.data?.total || 0);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let perfil = perfilGuardado;
    let id = localStorage.getItem('userId') || '';
    // O perfil e o id podem não estar no localStorage em todos os fluxos de login.
    try {
      const bruto = localStorage.getItem('userProfile');
      if (bruto) {
        const p = JSON.parse(bruto);
        perfil = p.tipo || p.perfil || perfil;
        id = p.id || id;
      }
    } catch {
      /* ignora */
    }
    setMeuPerfil(perfil);
    setEuId(id);
    carregarContactos();
  }, [carregarContactos]);

  useEffect(() => {
    carregarCaixa();
    carregarNaoLidas();
  }, [carregarCaixa, carregarNaoLidas]);

  useEffect(() => {
    if (fimConversa.current) {
      fimConversa.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversaMsgs]);

  // ---------------------------------------------------------------- acções
  const abrirConversa = async (contacto:Contacto) => {
    setConversaCom(contacto);
    setTextoConversa('');
    try {
      const res = await mensagensAPI.conversa(contacto.id);
      const lista: Mensagem[] = res.success ? res.data || [] : [];
      setConversaMsgs(lista);

      // Marcar como lidas as mensagens recebidas desta conversa
      const porLer = lista.filter((m) => !m.lida && m.destinatarioId === (euId || m.destinatarioId));
      for (const m of porLer) {
        if (m.destinatarioId === euId) await mensagensAPI.marcarComoLida(m.id);
      }
      if (porLer.length > 0) {
        await carregarNaoLidas();
        await carregarCaixa();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const enviarNova = async () => {
    if (!destinatarioId) {
      toast.error('Escolha o destinatário.');
      return;
    }
    if (!conteudo.trim()) {
      toast.error('Escreva a mensagem.');
      return;
    }
    try {
      setEnviando(true);
      const res = await mensagensAPI.enviar({
        destinatario_id: destinatarioId,
        assunto: assunto.trim() || undefined,
        conteudo: conteudo.trim(),
      });
      if (res.success) {
        toast.success('Mensagem enviada.');
        setConteudo('');
        setAssunto('');
        setFormAberto(false);
        await carregarCaixa();
        await carregarNaoLidas();
      } else {
        toast.error(res.error || 'Não foi possível enviar a mensagem.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  const enviarNaConversa = async () => {
    if (!conversaCom || !textoConversa.trim()) return;
    try {
      setAEnviarConversa(true);
      const res = await mensagensAPI.enviar({
        destinatario_id: conversaCom.id,
        conteudo: textoConversa.trim(),
      });
      if (res.success) {
        setTextoConversa('');
        const r = await mensagensAPI.conversa(conversaCom.id);
        if (r.success) setConversaMsgs(r.data || []);
        await carregarCaixa();
      } else {
        toast.error(res.error || 'Não foi possível enviar a mensagem.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setAEnviarConversa(false);
    }
  };

  // ---------------------------------------------------------------- helpers
  const oOutro = (m: Mensagem) => {
    if (caixa === 'entrada') {
      return {
        id: m.remetenteId,
        nome: m.remetenteNome || m.remetenteId,
        perfil: '',
      } as Contacto;
    }
    return {
      id: m.destinatarioId,
      nome: m.destinatarioNome || m.destinatarioId,
      perfil: '',
    } as Contacto;
  };

  const termo = busca.trim().toLowerCase();
  const mensagensFiltradas = mensagens.filter((m) => {
    if (!termo) return true;
    const nome = (oOutro(m).nome || '').toLowerCase();
    return (
      nome.includes(termo) ||
      (m.assunto || '').toLowerCase().includes(termo) ||
      m.conteudo.toLowerCase().includes(termo)
    );
  });

  const contactoPorId = (id: string) => contactos.find((c) => c.id === id);

  const dataCurta = (d: string) => new Date(d).toLocaleDateString('pt-PT');
  const hora = (d: string) =>
    new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  const saudacao = (perfil: string) =>
    perfil === 'admin'
      ? 'Comunique com técnicos e clientes'
      : perfil === 'tecnico'
        ? 'Fale com a administração e colegas'
        : 'Fale com a equipa de suporte';

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mensagens</h1>
          <p className="text-gray-600 mt-1">{saudacao(meuPerfil)}</p>
        </div>
        <button
          onClick={() => setFormAberto((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" />
          Nova Mensagem
        </button>
      </div>

      {/* Formulário de nova mensagem */}
      {formAberto && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destinatário</label>
              <select
                value={destinatarioId}
                onChange={(e) => setDestinatarioId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar utilizador…</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {PERFIL_LABEL[c.perfil] || c.perfil}
                  </option>
                ))}
              </select>
              {contactos.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Sem contactos disponíveis.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assunto (opcional)</label>
              <input
                type="text"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFormAberto(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={enviarNova}
              disabled={enviando}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors"
            >
              {enviando ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Caixa + conversa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCaixa('entrada')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  caixa === 'entrada' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Inbox className="w-4 h-4" />
                Recebidas
                {caixa === 'entrada' && naoLidas > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {naoLidas}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCaixa('saida')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  caixa === 'saida' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Send className="w-4 h-4" />
                Enviadas
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-auto max-h-[520px]">
            {loading ? (
              <div className="p-6 text-center">
                <Loader className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
              </div>
            ) : mensagensFiltradas.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">{termo ? 'Nenhuma mensagem encontrada.' : 'Sem mensagens.'}</p>
              </div>
            ) : (
              mensagensFiltradas.map((m) => {
                const outro = oOutro(m);
                const activo = conversaCom?.id === outro.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      const c = contactoPorId(outro.id) || outro;
                      abrirConversa(c);
                    }}
                    className={`w-full px-4 py-3 border-b border-gray-100 text-left transition-colors hover:bg-gray-50 ${
                      activo ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                        {iniciais(outro.nome)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900 truncate">{outro.nome}</p>
                          <p className="text-xs text-gray-500 shrink-0">{dataCurta(m.dataCriacao)}</p>
                        </div>
                        {m.assunto && (
                          <p className="text-xs text-gray-500 truncate">{m.assunto}</p>
                        )}
                        <p className="text-sm text-gray-600 truncate mt-0.5">{m.conteudo}</p>
                      </div>
                      {!m.lida && caixa === 'entrada' && (
                        <span className="w-2 h-2 mt-2 bg-blue-600 rounded-full shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
          {!conversaCom ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center px-6">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium text-gray-700">Selecione uma conversa</p>
                <p className="text-sm mt-1">
                  Escolha uma mensagem da lista para ver o histórico e responder.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <button
                  onClick={() => setConversaCom(null)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                  {iniciais(conversaCom.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{conversaCom.nome}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {conversaCom.perfil ? PERFIL_LABEL[conversaCom.perfil] || conversaCom.perfil : conversaCom.email}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
                {conversaMsgs.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">
                    Ainda não há mensagens nesta conversa.
                  </p>
                ) : (
                  conversaMsgs.map((m) => {
                    const meu = m.remetenteId === euId;
                    return (
                      <div key={m.id} className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                            meu ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          {!meu && (
                            <p className="text-xs font-semibold text-blue-700 mb-1">
                              {m.remetenteNome}
                            </p>
                          )}
                          {m.assunto && (
                            <p className={`text-xs font-semibold mb-1 ${meu ? 'text-blue-100' : 'text-gray-500'}`}>
                              {m.assunto}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{m.conteudo}</p>
                          <div className={`flex items-center gap-1 mt-1 ${meu ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-xs ${meu ? 'text-blue-100' : 'text-gray-400'}`}>
                              {hora(m.dataCriacao)}
                            </span>
                            {meu && (
                              <CheckCheck
                                className={`w-3 h-3 ${m.lida ? 'text-white' : 'text-blue-200'}`}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={fimConversa} />
              </div>

              <div className="p-3 border-t border-gray-200">
                <div className="flex items-end gap-2">
                  <textarea
                    value={textoConversa}
                    onChange={(e) => setTextoConversa(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        enviarNaConversa();
                      }
                    }}
                    rows={1}
                    placeholder="Escrever mensagem… (Enter envia, Shift+Enter nova linha)"
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={enviarNaConversa}
                    disabled={aEnviarConversa || !textoConversa.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors shrink-0"
                  >
                    {aEnviarConversa ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}