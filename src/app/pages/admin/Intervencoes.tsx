import { Search, Plus, Filter, Upload, File, X, Loader, Edit, CheckCircle, FileText, Trash2, MoreVertical, ChevronDown } from "lucide-react";
import React, { useState, useEffect } from "react";
import { intervencoesAPI, clientesAPI, tecnicosAPI } from "../../services/api";
import { toast } from "sonner";
const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:8001"
  : "https://suporte-backend-l9hm.onrender.com";

export default function AdminIntervencoes() {
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarEdicao, setMostrarEdicao] = useState(false);
  const [mostrarEdicaoCompleta, setMostrarEdicaoCompleta] = useState(false);
  const [intervencaoEditando, setIntervencaoEditando] = useState<any>(null);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState("");
  const [arquivosAnexados, setArquivosAnexados] = useState<Array<{ nome: string, tipo: string, tamanho: number, preview?: string, url?: string }>>([]);
  const [intervencoes, setIntervencoes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [dropdownClienteAberto, setDropdownClienteAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarPDF, setMostrarPDF] = useState(false);
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);
  const [imagensVer, setImagensVer] = useState<any[] | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");

  const [formData, setFormData] = useState({
    clienteId: "", tecnicoId: "", titulo: "", descricao: "",
    categoria: "Geral", prioridade: "Média", status: "Aberto", dataAgendada: "",
    modoResolucao: "", solicitante: "",
  });

  const [formEditar, setFormEditar] = useState({
    titulo: "", descricao: "", categoria: "Geral",
    prioridade: "Média", status: "Aberto", tecnicoId: "", modoResolucao: "", solicitante: "",
  });

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [intervencoesRes, clientesRes, tecnicosRes] = await Promise.all([
        intervencoesAPI.listar(),
        clientesAPI.listar(),
        tecnicosAPI.listar()
      ]);
      if (intervencoesRes.success) setIntervencoes(intervencoesRes.data);
      if (clientesRes.success) setClientes(clientesRes.data);
      if (tecnicosRes.success) setTecnicos(tecnicosRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await intervencoesAPI.criar({
        titulo: formData.titulo, descricao: formData.descricao,
        categoria: formData.categoria, prioridade: formData.prioridade,
        clienteId: formData.clienteId, tecnicoId: formData.tecnicoId || null,
        data_agendada: formData.dataAgendada || null,
        modo_resolucao: formData.modoResolucao || null,
        solicitante: formData.solicitante || null,
        anexos: arquivosAnexados.filter(a => a.url).map(a => ({ url: a.url, nome: a.nome, tipo: a.tipo })),

      });
      if (response.success) {
        setMostrarFormulario(false);
        setFormData({ clienteId: "", tecnicoId: "", titulo: "", descricao: "", categoria: "Geral", prioridade: "Média", status: "Aberto", dataAgendada: "", modoResolucao: "", solicitante: "" });
        setArquivosAnexados([]);
        carregarDados();
        toast.success('Intervenção criada com sucesso!');
      } else {
        toast.error('Erro ao criar intervenção: ' + (response.error || 'Erro desconhecido'));
      }
    } catch (error) {
      toast.error('Erro ao criar intervenção');
    }
  };

  // Abrir modal edição completa
  const abrirEdicaoCompleta = (intervencao: any) => {
    setIntervencaoEditando(intervencao);
    setFormEditar({
      titulo: intervencao.titulo || "",
      descricao: intervencao.descricao || "",
      categoria: intervencao.categoria || "Geral",
      prioridade: intervencao.prioridade || "Média",
      status: intervencao.status || "Aberto",
      tecnicoId: intervencao.tecnicoId || intervencao.tecnico_id || "",
      modoResolucao: intervencao.modoResolucao || intervencao.modo_resolucao || "",
      solicitante: intervencao.solicitante || "",
    });
    setMostrarEdicaoCompleta(true);
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervencaoEditando) return;
    try {
      const response = await intervencoesAPI.atualizar(intervencaoEditando.id, {
        titulo: formEditar.titulo,
        descricao: formEditar.descricao,
        categoria: formEditar.categoria,
        prioridade: formEditar.prioridade,
        status: formEditar.status,
        tecnico_id: formEditar.tecnicoId || null,
        modo_resolucao: formEditar.modoResolucao || null,
        solicitante: formEditar.solicitante || null,
      });
      if (response.success) {
        setMostrarEdicaoCompleta(false);
        setIntervencaoEditando(null);
        carregarDados();
        toast.success('Intervenção actualizada com sucesso!');
      } else {
        toast.error('Erro ao actualizar: ' + (response.error || 'Erro desconhecido'));
      }
    } catch (error) {
      toast.error('Erro ao actualizar intervenção');
    }
  };

  const abrirEdicaoTecnico = (intervencao: any) => {
    setIntervencaoEditando(intervencao);
    setTecnicoSelecionado(intervencao.tecnicoId || intervencao.tecnico_id || "");
    setMostrarEdicao(true);
  };

  const handleAtualizarTecnico = async (novoTecnicoId: string) => {
    if (!intervencaoEditando) return;
    try {
      const response = await intervencoesAPI.atualizar(intervencaoEditando.id, { tecnico_id: novoTecnicoId });
      if (response.success) {
        setMostrarEdicao(false);
        setIntervencaoEditando(null);
        setTecnicoSelecionado("");
        toast.success('Técnico atribuído com sucesso!');
        await carregarDados();
      } else {
        toast.error('Erro ao atribuir técnico: ' + (response.error || 'Erro desconhecido'));
      }
    } catch (error) {
      toast.error('Erro ao atribuir técnico');
    }
  };

  const handleConcluirIntervencao = (intervencaoId: string) => {
    toast('Tem certeza que deseja concluir esta intervenção?', {
      action: {
        label: 'Concluir',
        onClick: async () => {
          try {
            await intervencoesAPI.atualizarStatus(intervencaoId, "Concluído");
            toast.success('Intervenção concluída com sucesso!');
            carregarDados();
          } catch (error) {
            toast.error('Erro ao concluir intervenção');
          }
        },
      },
    });
  };

  const handleEliminarIntervencao = (intervencaoId: string) => {
    toast('Tem certeza que deseja eliminar esta intervenção?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            const response = await intervencoesAPI.deletar(intervencaoId);
            if (response.success) {
              toast.success('Intervenção eliminada com sucesso!');
              carregarDados();
            } else {
              toast.error(response.error || 'Erro ao eliminar intervenção');
            }
          } catch (error) {
            toast.error('Erro ao eliminar intervenção');
          }
        },
      },
    });
  };

  const handleDownloadPDF = (intervencaoId: string) => {
    if (!intervencaoId) { toast.error('Erro: ID da intervenção não encontrado.'); return; }
    setPdfUrl(`${API_BASE_URL}/relatorios/intervencao/${intervencaoId}/visualizar`);
    setMostrarPDF(true);
  };

  const intervencoesFiltradas = intervencoes.filter(intervencao => {
    const matchStatus = filtroStatus === "Todos" || intervencao.status === filtroStatus;
    const matchPrioridade = filtroPrioridade === "Todos" || intervencao.prioridade === filtroPrioridade;
    const termo = searchTerm.toLowerCase();
    const matchSearch =
      intervencao.titulo.toLowerCase().includes(termo) ||
      (intervencao.tecnicoNome || "").toLowerCase().includes(termo) ||
      (intervencao.empresaNome || "").toLowerCase().includes(termo) ||
      (intervencao.clienteNome || "").toLowerCase().includes(termo);
    return matchStatus && matchPrioridade && matchSearch;
  });

  const CLOUD_NAME = "dkcq4gtxp";
  const UPLOAD_PRESET = "clacs_anexos";

  async function enviarParaCloudinary(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error("Falha no upload");
    const data = await res.json();
    return data.secure_url as string;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const temp = { nome: file.name, tipo: file.type, tamanho: file.size, preview: undefined as string | undefined, url: undefined as string | undefined };
      setArquivosAnexados(prev => [...prev, temp]);
      try {
        const url = await enviarParaCloudinary(file);
        setArquivosAnexados(prev => prev.map(a =>
          a.nome === file.name ? { ...a, url, preview: file.type.startsWith("image/") ? url : undefined } : a
        ));
      } catch {
        toast.error(`Erro ao carregar ${file.name}`);
        setArquivosAnexados(prev => prev.filter(a => a.nome !== file.name));
      }
    }
  };

  const removerArquivo = (index: number) => setArquivosAnexados(prev => prev.filter((_, i) => i !== index));
  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Carregando intervenções...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Intervenções</h1>
          <p className="text-gray-600 mt-1">Visualize e gerencie todas as intervenções</p>
        </div>
        <button onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-5 h-5" /> Nova Intervenção
        </button>
      </div>

      {/* Formulário Nova Intervenção */}
      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Nova Intervenção</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                <button type="button" onClick={() => setDropdownClienteAberto(!dropdownClienteAberto)}
                  className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left text-gray-900">
                  <span>
                    {formData.clienteId
                      ? (() => { const c = clientes.find(c => c.id === formData.clienteId); return c ? (c.empresa || c.nome) : "Selecione o cliente..."; })()
                      : "Selecione o cliente..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Input escondido para manter a validação HTML "required" */}
                <input type="text" required value={formData.clienteId} readOnly tabIndex={-1}
                  className="absolute opacity-0 pointer-events-none h-0 w-0" />

                {dropdownClienteAberto && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownClienteAberto(false)} />
                    <div className="absolute left-0 top-full mt-1 w-full max-h-64 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                      {clientes.filter(c => c.status === "Ativo").map(c => (
                        <button key={c.id} type="button"
                          onClick={() => { setFormData({ ...formData, clienteId: c.id }); setDropdownClienteAberto(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors">
                          {c.empresa || c.nome}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Técnico</label>
                <select value={formData.tecnicoId} onChange={(e) => setFormData({ ...formData, tecnicoId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione o técnico...</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
              <input type="text" required value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Descreva brevemente o problema..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Solicitante</label>
              <input type="text" value={formData.solicitante} onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                placeholder="Nome de quem solicitou"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição Detalhada</label>
              <textarea rows={4} value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Forneça mais detalhes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Agendada</label>
              <input
                type="datetime-local"
                value={formData.dataAgendada}
                onChange={e => setFormData({ ...formData, dataAgendada: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Geral</option><option>Hardware</option><option>Software</option><option>Rede</option><option>Segurança</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                <select value={formData.prioridade} onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Baixa</option><option>Média</option><option>Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Aberto</option><option>Em Andamento</option><option>Aguardando Cliente</option><option>Concluído</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Resolução</label>
                <select value={formData.modoResolucao} onChange={(e) => setFormData({ ...formData, modoResolucao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Não definido</option>
                  <option value="Remoto">Remoto</option>
                  <option value="Presencial">Presencial</option>
                </select>
              </div>

            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Anexar Imagens ou Documentos</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="hidden" id="admin-file-upload" />
                <label htmlFor="admin-file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Clique para carregar arquivos</p>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF, DOC (máx. 10MB cada)</p>
                </label>
              </div>
              {arquivosAnexados.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {arquivosAnexados.map((arquivo, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group hover:bg-gray-100">
                      {arquivo.preview
                        ? <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-200"><img src={arquivo.preview} alt={arquivo.nome} className="w-full h-full object-cover" /></div>
                        : <div className="w-12 h-12 flex-shrink-0 bg-blue-100 rounded flex items-center justify-center"><File className="w-6 h-6 text-blue-600" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{arquivo.nome}</p>
                        <p className="text-xs text-gray-500">{formatarTamanho(arquivo.tamanho)}</p>
                      </div>
                      <button type="button" onClick={() => removerArquivo(index)}
                        className="w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Criar Intervenção</button>
              <button type="button" onClick={() => { setMostrarFormulario(false); setArquivosAnexados([]); }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><p className="text-sm text-gray-600 mb-1">Total</p><p className="text-2xl font-bold text-gray-900">{intervencoes.length}</p></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><p className="text-sm text-gray-600 mb-1">Abertos</p><p className="text-2xl font-bold text-blue-600">{intervencoes.filter(c => c.status === "Aberto").length}</p></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><p className="text-sm text-gray-600 mb-1">Em Andamento</p><p className="text-2xl font-bold text-yellow-600">{intervencoes.filter(c => c.status === "Em Andamento").length}</p></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><p className="text-sm text-gray-600 mb-1">Concluídos</p><p className="text-2xl font-bold text-green-600">{intervencoes.filter(c => c.status === "Concluído").length}</p></div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4"><Filter className="w-5 h-5 text-gray-600" /><h3 className="font-semibold text-gray-900">Filtros</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Buscar por título, técnico, empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Todos</option><option>Aberto</option><option>Em Andamento</option><option>Resolvido</option><option>Fechado</option><option>Concluído</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
            <select value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Todos</option><option>Baixa</option><option>Média</option><option>Alta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      {intervencoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Nenhuma intervenção encontrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {intervencoesFiltradas.map(intervencao => {
            const cliente = clientes.find(c => c.id === intervencao.clienteId);
            const tecnico = tecnicos.find(t => t.id === intervencao.tecnicoId);
            return (
              <div key={intervencao.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-sm font-mono text-gray-500 mt-1">{intervencao.numero}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{intervencao.titulo}</h3>
                        <p className="text-sm text-gray-600 mb-3">{intervencao.descricao}</p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <div className="flex items-center gap-2"><span className="text-gray-500">Cliente:</span><span className="font-medium text-gray-900">{cliente ? (cliente.empresa || cliente.nome) : (intervencao.empresaNome || intervencao.clienteNome || 'N/A')}</span></div>
                          <div className="flex items-center gap-2"><span className="text-gray-500">Técnico:</span><span className="font-medium text-gray-900">{tecnico ? tecnico.nome : intervencao.tecnicoNome || 'Não atribuído'}</span></div>
                          <div className="flex items-center gap-2"><span className="text-gray-500">Categoria:</span><span className="font-medium text-gray-900">{intervencao.categoria}</span></div>
                          <div className="flex items-center gap-2"><span className="text-gray-500">Criado:</span><span className="font-medium text-gray-900">{new Date(intervencao.dataCriacao).toLocaleDateString('pt-AO')}</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${intervencao.prioridade === "Alta" ? "bg-red-100 text-red-700" : intervencao.prioridade === "Média" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        {intervencao.prioridade} Prioridade
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${intervencao.status === "Concluído" ? "bg-green-100 text-green-700" : intervencao.status === "Em Andamento" ? "bg-blue-100 text-blue-700" : intervencao.status === "Aguardando Cliente" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                        {intervencao.status}
                      </span>
                    </div>
                  </div>

                  <div className="lg:text-right space-y-2 relative">
                    <div className="bg-blue-50 px-4 py-2 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Horas Gastas</p>
                      <p className="text-2xl font-bold text-blue-700">{Number(intervencao.horasGastas || intervencao.horas_gastas || 0).toFixed(2)}h</p>
                    </div>

                    <button onClick={() => setMenuAbertoId(menuAbertoId === intervencao.id ? null : intervencao.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" /> Ações
                    </button>

                    {menuAbertoId === intervencao.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuAbertoId(null)} />
                        <div className="absolute right-full top-0 mr-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                          <button onClick={() => { handleDownloadPDF(intervencao.id); setMenuAbertoId(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <FileText className="w-4 h-4" /> Baixar PDF
                          </button>

                          {(intervencao.anexos?.length > 0) && (
                            <button onClick={() => { setImagensVer(intervencao.anexos); setMenuAbertoId(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <File className="w-4 h-4" /> Ver Imagens ({intervencao.anexos.length})
                            </button>
                          )}

                          <button onClick={() => { abrirEdicaoCompleta(intervencao); setMenuAbertoId(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 transition-colors">
                            <Edit className="w-4 h-4" /> Editar
                          </button>

                          {!["Concluído", "Resolvido", "Fechado"].includes(intervencao.status) && (
                            <button onClick={() => { abrirEdicaoTecnico(intervencao); setMenuAbertoId(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition-colors">
                              <Edit className="w-4 h-4" /> Atribuir Técnico
                            </button>
                          )}

                          {intervencao.status === "Fechado" && (
                            <button onClick={() => { handleConcluirIntervencao(intervencao.id); setMenuAbertoId(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors">
                              <CheckCircle className="w-4 h-4" /> Concluir
                            </button>
                          )}

                          {!["Concluído", "Resolvido"].includes(intervencao.status) && (
                            <button onClick={() => { handleEliminarIntervencao(intervencao.id); setMenuAbertoId(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors border-t border-gray-100">
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Edição Completa */}
      {mostrarEdicaoCompleta && intervencaoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Editar Intervenção</h3>
              <button onClick={() => { setMostrarEdicaoCompleta(false); setIntervencaoEditando(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleEditar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                <input type="text" required value={formEditar.titulo} onChange={(e) => setFormEditar({ ...formEditar, titulo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <textarea rows={3} value={formEditar.descricao} onChange={(e) => setFormEditar({ ...formEditar, descricao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <select value={formEditar.categoria} onChange={(e) => setFormEditar({ ...formEditar, categoria: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Geral</option><option>Hardware</option><option>Software</option><option>Rede</option><option>Segurança</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                  <select value={formEditar.prioridade} onChange={(e) => setFormEditar({ ...formEditar, prioridade: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Baixa</option><option>Média</option><option>Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={formEditar.status} onChange={(e) => setFormEditar({ ...formEditar, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Aberto</option><option>Em Andamento</option><option>Aguardando Cliente</option><option>Resolvido</option><option>Concluído</option>
                </select>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Resolução</label>
                  <select value={formEditar.modoResolucao} onChange={(e) => setFormEditar({ ...formEditar, modoResolucao: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Não definido</option>
                    <option value="Remoto">Remoto</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Técnico</label>
                <select value={formEditar.tecnicoId} onChange={(e) => setFormEditar({ ...formEditar, tecnicoId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sem técnico</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setMostrarEdicaoCompleta(false); setIntervencaoEditando(null); }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Atribuir Técnico */}
      {mostrarEdicao && intervencaoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Atribuir Técnico</h3>
            <p className="text-sm text-gray-600 mb-4">Intervenção: <strong>{intervencaoEditando.titulo}</strong></p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Técnico</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={tecnicoSelecionado} onChange={(e) => setTecnicoSelecionado(e.target.value)}>
                <option value="">Selecione...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleAtualizarTecnico(tecnicoSelecionado)} disabled={!tecnicoSelecionado}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">Confirmar</button>
              <button onClick={() => { setMostrarEdicao(false); setIntervencaoEditando(null); setTecnicoSelecionado(""); }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PDF */}
      {mostrarPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Relatório da Intervenção</h2>
              <button onClick={() => { setMostrarPDF(false); setPdfUrl(""); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe src={pdfUrl} title="PDF" className="w-full h-full" />
            </div>
          </div>
        </div>
      )}

      {imagensVer && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Imagens da Intervenção</h2>
              <button onClick={() => setImagensVer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-1 gap-4">
              {imagensVer.map((a: any, idx: number) => (
                a.tipo?.startsWith("image") ? (
                  <a key={idx} href={a.url} target="_blank" rel="noreferrer" className="block">
                    <img src={a.url} alt={a.nome} className="w-full max-h-80 object-contain bg-gray-50 rounded-lg border border-gray-200 hover:opacity-90" />
                    <p className="text-xs text-gray-500 mt-1 truncate">{a.nome}</p>
                  </a>
                ) : (
                  <a key={idx} href={a.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">
                    <File className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-700 truncate">{a.nome}</span>
                  </a>
                )
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
