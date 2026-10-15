import React, { useState, useEffect } from "react";
import { financeiroAPI } from "../../services/api";
import { formatarMoedaInput, normalizarMoeda, parseMoeda, formatarMoedaExibicao } from "../../services/moeda";
import { toast } from "sonner";
import { Search, Plus, Loader, Trash2, Wallet, TrendingUp, TrendingDown, Edit, X, Filter, Building2, MoreVertical, Download, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const FORMAS_PAGAMENTO = ["Numerário", "Multicaixa", "Transferência Bancária", "Cheque", "Cartão", "Outro"];
const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const TIPOS_FILTRO = ["Geral", "Entradas", "Saídas"];
const today = () => new Date().toISOString().slice(0, 10);
const API_BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://suporte-backend-l9hm.onrender.com";

export default function AdminFinanceiro() {
    const [movimentos, setMovimentos] = useState<any[]>([]);
    const [contas, setContas] = useState<any[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [saldoTotal, setSaldoTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filtroTipo, setFiltroTipo] = useState("Geral");
    const [filtroConta, setFiltroConta] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    // Período: mes = 0 significa "Todos os meses"
    const agora = new Date();
    const [mes, setMes] = useState(agora.getMonth() + 1);
    const [ano, setAno] = useState(agora.getFullYear());

    // Relatório financeiro (modal de exportação)
    const [modalRelatorio, setModalRelatorio] = useState(false);
    const [finTipo, setFinTipo] = useState("Todas");
    const [finConta, setFinConta] = useState("");

    // Modal atual: null | "entrada" | "despesa" | "conta" | "editar"
    const [modal, setModal] = useState<null | "entrada" | "despesa" | "conta" | "editar">(null);
    const [entrada, setEntrada] = useState({ data: today(), conta_bancaria_id: "", descricao: "", categoria: "", forma_pagamento: "", valor: "" });
    const [despesa, setDespesa] = useState({ data: today(), conta_bancaria_id: "", descricao: "", categoria: "", forma_pagamento: "", destinatario: "", valor: "" });
    const [editandoConta, setEditandoConta] = useState<any>(null);
    const [conta, setConta] = useState({ banco: "", numero_conta: "", titular: "" });

    // Edição de movimento
    const [editandoMov, setEditandoMov] = useState<any>(null);
    const [editForm, setEditForm] = useState({ data: today(), conta_bancaria_id: "", descricao: "", categoria: "", forma_pagamento: "", destinatario: "", valor: "" });
    const [menuMovId, setMenuMovId] = useState<{ id: string; x: number; y: number } | null>(null);

    const abrirMenuMov = (e: React.MouseEvent<HTMLButtonElement>, mov: any) => {
        e.stopPropagation();
        if (menuMovId?.id === mov.id) { setMenuMovId(null); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuMovId({ id: mov.id, x: rect.right, y: rect.bottom });
    };

    // Gestão de categorias
    const [modalCategorias, setModalCategorias] = useState(false);
    const [categoriaNome, setCategoriaNome] = useState("");
    const [editandoCategoria, setEditandoCategoria] = useState<any>(null);

    useEffect(() => { carregar(); }, []);

    const carregar = async () => {
        try {
            setLoading(true);
            const res = await financeiroAPI.listar();
            if (res.success) {
                setMovimentos(res.data.movimentos || []);
                setContas(res.data.contas || []);
                setCategorias(res.data.categorias || []);
                setSaldoTotal(res.data.saldo_total ?? res.data.saldo_bancario ?? 0);
            }
        } catch (error) {
            console.error("Erro ao carregar dados financeiros:", error);
        } finally {
            setLoading(false);
        }
    };

    const nomeConta = (id?: string) => {
        const c = contas.find(x => x.id === id);
        return c ? (c.numero_conta ? `${c.banco} · ${c.numero_conta}` : c.banco) : (id ? id : "");
    };

    const abrirRelatorioFinanceiro = () => {
        const params = new URLSearchParams();
        if (finTipo !== "Todas") params.set("tipo", finTipo);
        if (finConta) params.set("conta", finConta);
        if (mes) {
            const mm = String(mes).padStart(2, "0");
            const ultimoDia = new Date(ano, mes, 0).getDate();
            params.set("data_inicio", `${ano}-${mm}-01`);
            params.set("data_fim", `${ano}-${mm}-${String(ultimoDia).padStart(2, "0")}`);
        }
        const qs = params.toString();
        window.open(`${API_BASE_URL}/relatorios/financeiro${qs ? `?${qs}` : ""}`, '_blank');
        setModalRelatorio(false);
    };

    // ---- Modais ----

    const abrirNovaEntrada = () => {
        setEntrada({ data: today(), conta_bancaria_id: contas.length ? contas[0].id : "", descricao: "", categoria: "", forma_pagamento: "", valor: "" });
        setModal("entrada");
    };

const abrirNovaDespesa = () => {
        setDespesa({ data: today(), conta_bancaria_id: contas.length ? contas[0].id : "", descricao: "", categoria: "", forma_pagamento: "", destinatario: "", valor: "" });
        setModal("despesa");
    };

    const abrirNovaConta = () => {
        setEditandoConta(null);
        setConta({ banco: "", numero_conta: "", titular: "" });
        setModal("conta");
    };

    const abrirEditarConta = (c: any) => {
        setEditandoConta(c);
        setConta({ banco: c.banco, numero_conta: c.numero_conta || "", titular: c.titular || "" });
        setModal("conta");
    };

    const abrirEditarMov = (mov: any) => {
        const d = mov.data ? new Date(mov.data) : new Date();
        const ds = isNaN(d.getTime()) ? today() : d.toISOString().slice(0, 10);
        setEditandoMov(mov);
        setEditForm({
            data: ds,
            conta_bancaria_id: mov.conta_bancaria_id || "",
            descricao: mov.descricao || "",
            categoria: mov.categoria || "",
            forma_pagamento: mov.forma_pagamento || "",
            destinatario: mov.destinatario || "",
            valor: normalizarMoeda(String(mov.valor ?? "")),
        });
        setModal("editar");
    };

    const fecharModal = () => {
        setModal(null);
        setEditandoConta(null);
        setEditandoMov(null);
        setEditForm({ data: today(), conta_bancaria_id: "", descricao: "", categoria: "", forma_pagamento: "", destinatario: "", valor: "" });
    };

    // ---- Movimentos ----

    const handleCriarEntrada = async (e: React.FormEvent) => {
        e.preventDefault();
        const valorNum = parseMoeda(entrada.valor);
        if (isNaN(valorNum) || valorNum <= 0) { toast.error("Insira um valor válido."); return; }
        try {
            const res = await financeiroAPI.criar({
                tipo: "Entrada",
                descricao: entrada.descricao.trim() || undefined,
                valor: valorNum,
                categoria: entrada.categoria || undefined,
                forma_pagamento: entrada.forma_pagamento || undefined,
                data: entrada.data || undefined,
                conta_bancaria_id: entrada.conta_bancaria_id || undefined,
            });
            if (res.success) {
                toast.success("Entrada registada com sucesso!");
                fecharModal();
                carregar();
            } else {
                toast.error(res.error || "Erro ao registar entrada");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao registar entrada");
        }
    };

    const handleCriarDespesa = async (e: React.FormEvent) => {
        e.preventDefault();
        const valorNum = parseMoeda(despesa.valor);
        if (isNaN(valorNum) || valorNum <= 0) { toast.error("Insira um valor válido."); return; }
        if (!despesa.descricao.trim()) { toast.error("Descreva a despesa."); return; }
        try {
            const res = await financeiroAPI.criar({
                tipo: "Saida",
                descricao: despesa.descricao.trim(),
                valor: valorNum,
                categoria: despesa.categoria || undefined,
                forma_pagamento: despesa.forma_pagamento || undefined,
                destinatario: despesa.destinatario.trim() || undefined,
                data: despesa.data || undefined,
                conta_bancaria_id: despesa.conta_bancaria_id || undefined,
            });
            if (res.success) {
                toast.success("Despesa registada com sucesso!");
                fecharModal();
                carregar();
            } else {
                toast.error(res.error || "Erro ao registar despesa");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao registar despesa");
        }
    };

    const handleAtualizarMov = async (e: React.FormEvent) => {
        e.preventDefault();
        const valorNum = parseMoeda(editForm.valor);
        if (isNaN(valorNum) || valorNum <= 0) { toast.error("Insira um valor válido."); return; }
        try {
            const res = await financeiroAPI.atualizar(editandoMov.id, {
                descricao: editForm.descricao.trim() || undefined,
                valor: valorNum,
                categoria: editForm.categoria || undefined,
                forma_pagamento: editForm.forma_pagamento || undefined,
                destinatario: editForm.destinatario.trim() || undefined,
                data: editForm.data || undefined,
                conta_bancaria_id: editForm.conta_bancaria_id || undefined,
            });
            if (res.success) {
                toast.success("Movimento actualizado com sucesso!");
                fecharModal();
                carregar();
            } else {
                toast.error(res.error || "Erro ao actualizar movimento");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao actualizar movimento");
        }
    };

    const handleEliminar = (mov: any) => {
        toast(`Eliminar "${mov.descricao}"?`, {
            action: {
                label: "Eliminar",
                onClick: async () => {
                    const res = await financeiroAPI.eliminar(mov.id);
                    if (res.success) {
                        toast.success("Movimento eliminado!");
                        carregar();
                    } else {
                        toast.error(res.error || "Erro ao eliminar");
                    }
                },
            },
        });
    };

    // ---- Conta bancária ----

    const handleGuardarConta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!conta.banco.trim()) { toast.error("Indique o banco."); return; }
        const payload = {
            banco: conta.banco.trim(),
            numero_conta: conta.numero_conta.trim() || undefined,
            titular: conta.titular.trim() || undefined,
        };
        try {
            const res = editandoConta
                ? await financeiroAPI.contas.atualizar(editandoConta.id, payload)
                : await financeiroAPI.contas.criar(payload);
            if (res.success) {
                toast.success(editandoConta ? "Conta actualizada com sucesso!" : "Conta bancária cadastrada com sucesso!");
                fecharModal();
                carregar();
            } else {
                toast.error(res.error || "Erro ao guardar conta");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao guardar conta");
        }
    };

    const handleEliminarConta = (c: any) => {
        toast(`Eliminar conta "${c.banco}"?`, {
            action: {
                label: "Eliminar",
                onClick: async () => {
                    const res = await financeiroAPI.contas.eliminar(c.id);
                    if (res.success) {
                        toast.success("Conta eliminada!");
                        carregar();
                    } else {
                        toast.error(res.error || "Erro ao eliminar");
                    }
                },
            },
        });
    };

    // ---- Categorias ----

    const abrirCategorias = () => {
        setCategoriaNome("");
        setEditandoCategoria(null);
        setModalCategorias(true);
    };

    const abrirEditarCategoria = (cat: any) => {
        setEditandoCategoria(cat);
        setCategoriaNome(cat.nome);
    };

    const cancelarEdicaoCategoria = () => {
        setEditandoCategoria(null);
        setCategoriaNome("");
    };

    const handleGuardarCategoria = async (e: React.FormEvent) => {
        e.preventDefault();
        const nome = categoriaNome.trim();
        if (!nome) { toast.error("Indique o nome da categoria."); return; }
        try {
            const res = editandoCategoria
                ? await financeiroAPI.categorias.atualizar(editandoCategoria.id, { nome })
                : await financeiroAPI.categorias.criar({ nome });
            if (res.success) {
                toast.success(editandoCategoria ? "Categoria actualizada com sucesso!" : "Categoria adicionada com sucesso!");
                setCategoriaNome("");
                setEditandoCategoria(null);
                carregar();
            } else {
                toast.error(res.error || "Erro ao guardar categoria");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao guardar categoria");
        }
    };

    const handleEliminarCategoria = (cat: any) => {
        toast(`Eliminar a categoria "${cat.nome}"?`, {
            action: {
                label: "Eliminar",
                onClick: async () => {
                    const res = await financeiroAPI.categorias.eliminar(cat.id);
                    if (res.success) {
                        toast.success("Categoria eliminada!");
                        if (editandoCategoria?.id === cat.id) cancelarEdicaoCategoria();
                        carregar();
                    } else {
                        toast.error(res.error || "Erro ao eliminar");
                    }
                },
            },
        });
    };

    // ---- Filtros ----

    const mudarMes = (delta: number) => {
        let novoMes = (mes || agora.getMonth() + 1) + delta;
        let novoAno = ano;
        if (novoMes > 12) { novoMes = 1; novoAno += 1; }
        if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
        setMes(novoMes);
        setAno(novoAno);
    };
    const eMesAtual = mes === agora.getMonth() + 1 && ano === agora.getFullYear();

    // Compara pelo texto "AAAA-MM" da data para não sofrer desvios de fuso horário
    const prefixoPeriodo = mes ? `${ano}-${String(mes).padStart(2, "0")}` : null;
    const movimentosDoPeriodo = prefixoPeriodo
        ? movimentos.filter(m => String(m.data || "").slice(0, 7) === prefixoPeriodo)
        : movimentos;
    const rotuloPeriodo = mes ? `${NOMES_MESES[mes - 1]} ${ano}` : "todos os meses";

    const movimentosFiltrados = movimentosDoPeriodo.filter(m => {
        const matchTipo =
            filtroTipo === "Geral" ||
            (filtroTipo === "Entradas" && m.tipo === "Entrada") ||
            (filtroTipo === "Saídas" && m.tipo === "Saida");
        const matchConta = !filtroConta || m.conta_bancaria_id === filtroConta;
        const termo = searchTerm.toLowerCase();
        const matchSearch =
            (m.numero || "").toLowerCase().includes(termo) ||
            (m.descricao || "").toLowerCase().includes(termo) ||
            (m.categoria || "").toLowerCase().includes(termo) ||
            (m.forma_pagamento || "").toLowerCase().includes(termo) ||
            (m.destinatario || "").toLowerCase().includes(termo) ||
            nomeConta(m.conta_bancaria_id).toLowerCase().includes(termo);
        return matchTipo && matchConta && matchSearch;
    });

    const temSaidas = movimentosFiltrados.some(m => m.tipo === "Saida");

    const totalEntradas = movimentosDoPeriodo.filter(m => m.tipo === "Entrada").reduce((s, m) => s + m.valor, 0);
    const totalSaidas = movimentosDoPeriodo.filter(m => m.tipo === "Saida").reduce((s, m) => s + m.valor, 0);

    const fmt = (v: number) => formatarMoedaExibicao(v) + " Kz";

    if (loading && (movimentos || []).length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Carregando dados financeiros...</p>
                </div>
            </div>
        );
    }

    const campoCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all";
    const labelCls = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2";

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Controlo Financeiro</h1>
                    <p className="text-gray-600 mt-1">Entradas, despesas, contas bancárias e saldo disponível</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={abrirNovaEntrada}
                        className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg transition-colors">
                        <Plus className="w-5 h-5" /> Nova Entrada
                    </button>
                    <button onClick={abrirNovaDespesa}
                        className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg transition-colors">
                        <Plus className="w-5 h-5" /> Nova Despesa
                    </button>
                </div>
            </div>

            {/* Contas bancárias */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Contas Bancárias</h3>
                            <p className="text-xs text-gray-500">Gestão das contas e saldos</p>
                        </div>
                    </div>
                    <button onClick={abrirNovaConta}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                        <Plus className="w-4 h-4" /> Nova Conta
                    </button>
                </div>

                {contas.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhuma conta bancária cadastrada. Clique em "Nova Conta" para cadastrar.</p>
                ) : (
                    <div className="space-y-3">
                        {contas.map((c) => (
                            <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-medium text-gray-900">{c.banco} {c.numero_conta ? <span className="text-gray-500">· {c.numero_conta}</span> : null}</p>
                                        <p className="text-xs text-gray-500">{c.titular || ""}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Saldo</p>
                                        <p className="font-semibold text-blue-700">{fmt(c.saldo)}</p>
                                    </div>
                                    <button onClick={() => abrirEditarConta(c)} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleEliminarConta(c)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-1 text-blue-100"><Wallet className="w-4 h-4" /><p className="text-sm">Saldo Total</p></div>
                    <p className="text-2xl font-bold">{fmt(saldoTotal)}</p>
                    <p className="text-xs text-blue-200 mt-1">contas bancárias + entradas − despesas</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-1 text-green-600"><TrendingUp className="w-4 h-4" /><p className="text-sm text-gray-600">Total de Entradas</p></div>
                    <p className="text-2xl font-bold text-green-700">{fmt(totalEntradas)}</p>
                    <p className="text-xs text-gray-500 mt-1">{rotuloPeriodo}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-1 text-red-600"><TrendingDown className="w-4 h-4" /><p className="text-sm text-gray-600">Total de Despesas</p></div>
                    <p className="text-2xl font-bold text-red-700">{fmt(totalSaidas)}</p>
                    <p className="text-xs text-gray-500 mt-1">{rotuloPeriodo}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <p className="text-sm text-gray-600 mb-1">Movimentos</p>
                    <p className="text-2xl font-bold text-gray-900">{movimentosDoPeriodo.length}</p>
                    <p className="text-xs text-gray-500 mt-1">{rotuloPeriodo}</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label className={labelCls}>Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" placeholder="Buscar por Nº, descrição, categoria..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={campoCls + " pl-10"} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Conta bancária</label>
                        <select value={filtroConta} onChange={(e) => setFiltroConta(e.target.value)}
                            className={campoCls + " w-full"}>
                            <option value="">Todas</option>
                            {contas.map(c => <option key={c.id} value={c.id}>{nomeConta(c.id)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Mês</label>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-xl px-1.5 py-1">
                                <button onClick={() => mudarMes(-1)} title="Mês anterior"
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <CalendarDays className="w-4 h-4 text-gray-400 ml-1" />
                                <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}
                                    className="bg-transparent font-semibold text-gray-900 py-1 pl-1 pr-1 focus:outline-none cursor-pointer">
                                    <option value={0}>Todos os meses</option>
                                    {NOMES_MESES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
                                </select>
                                {mes !== 0 && (
                                    <input type="number" value={ano}
                                        onChange={(e) => { const v = parseInt(e.target.value); if (v > 1999 && v < 2100) setAno(v); }}
                                        className="w-16 bg-transparent font-semibold text-gray-900 text-center py-1 focus:outline-none" />
                                )}
                                <button onClick={() => mudarMes(1)} title="Mês seguinte"
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                            {!eMesAtual && (
                                <button onClick={() => { setMes(agora.getMonth() + 1); setAno(agora.getFullYear()); }}
                                    className="px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors whitespace-nowrap">
                                    Mês actual
                                </button>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setModalRelatorio(true)}
                        className="flex items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2.5 rounded-xl transition-colors font-medium whitespace-nowrap">
                        <Download className="w-5 h-5" />
                        Exportar PDF
                    </button>
                </div>
            </div>

            {/* Histórico */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center"><Filter className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Histórico de Movimentos</h3>
                            <p className="text-xs text-gray-500">Registo de entradas e despesas — {rotuloPeriodo}</p>
                        </div>
                    </div>
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {TIPOS_FILTRO.map(t => (
                            <button key={t}
                                onClick={() => setFiltroTipo(t)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtroTipo === t ? "bg-white shadow-sm text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {movimentosFiltrados.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-gray-500">Nenhum movimento encontrado em {rotuloPeriodo}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3">Nº</th>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Conta</th>
                                    <th className="px-4 py-3">Descrição</th>
                                    {temSaidas && <th className="px-4 py-3">Destinatário</th>}
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3">Forma de pagamento</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-right">Acções</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimentosFiltrados.map(mov => (
                                    <tr key={mov.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{mov.numero || ""}</td>
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{new Date(mov.data).toLocaleDateString("pt-AO")}</td>
                                        <td className="px-4 py-3 text-gray-700">{nomeConta(mov.conta_bancaria_id)}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{mov.descricao}</td>
                                        {temSaidas && <td className="px-4 py-3 text-gray-700">{mov.tipo === "Saida" ? (mov.destinatario || "") : ""}</td>}
                                        <td className="px-4 py-3 text-gray-700">{mov.categoria || ""}</td>
                                        <td className="px-4 py-3 text-gray-700">{mov.forma_pagamento || ""}</td>
                                        <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${mov.tipo === "Entrada" ? "text-green-700" : "text-red-700"}`}>
                                            {mov.tipo === "Entrada" ? "+" : "−"} {fmt(mov.valor)}
                                        </td>
                                        <td className="px-4 py-3 text-right relative">
                                            <button onClick={(e) => abrirMenuMov(e, mov)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {menuMovId?.id === mov.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setMenuMovId(null)} />
                                                    <div className="fixed z-50 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                                                        style={{ top: menuMovId.y + 4, right: window.innerWidth - menuMovId.x + 2 }}>
                                                        <button onClick={() => { setMenuMovId(null); abrirEditarMov(mov); }}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                                            <Edit className="w-4 h-4" /> Editar
                                                        </button>
                                                        <button onClick={() => { setMenuMovId(null); handleEliminar(mov); }}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4" /> Eliminar
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Relatório Financeiro */}
            {modalRelatorio && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><Download className="w-5 h-5 text-green-600" /></div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Exportar Relatório</h2>
                                    <p className="text-xs text-gray-500">{mes ? `Período: ${NOMES_MESES[mes - 1]} ${ano}` : "Período: todos os meses"}</p>
                                </div>
                            </div>
                            <button onClick={() => setModalRelatorio(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className={labelCls}>Tipo de movimento</label>
                                <select value={finTipo} onChange={(e) => setFinTipo(e.target.value)}
                                    className={campoCls}>
                                    <option value="Todas">Todas</option>
                                    <option value="Entrada">Entradas</option>
                                    <option value="Saida">Saídas</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Conta bancária</label>
                                <select value={finConta} onChange={(e) => setFinConta(e.target.value)}
                                    className={campoCls}>
                                    <option value="">Todas</option>
                                    {contas.map(c => <option key={c.id} value={c.id}>{nomeConta(c.id)}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-5 border-t border-gray-100">
                                <button type="button" onClick={() => setModalRelatorio(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors">Cancelar</button>
                                <button type="button" onClick={abrirRelatorioFinanceiro}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">Exportar PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nova Entrada */}
            {modal === "entrada" && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Nova Entrada</h2>
                            <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCriarEntrada} className="p-8 space-y-5 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Data</label>
                                    <input type="date" value={entrada.data}
                                        onChange={(e) => setEntrada({ ...entrada, data: e.target.value })}
                                        className={campoCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Conta bancária</label>
                                    <select value={entrada.conta_bancaria_id} onChange={(e) => setEntrada({ ...entrada, conta_bancaria_id: e.target.value })}
                                        className={campoCls}>
                                        {contas.length === 0 && <option value="">Nenhuma conta registada</option>}
                                        {contas.map(c => <option key={c.id} value={c.id}>{nomeConta(c.id)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Descrição</label>
                                <input type="text" value={entrada.descricao}
                                    onChange={(e) => setEntrada({ ...entrada, descricao: e.target.value })}
                                    className={campoCls} placeholder="Ex: Recebimento de serviço" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className={labelCls + " mb-0"}>Categoria</label>
                                        <button type="button" onClick={abrirCategorias}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700">Gerir categorias</button>
                                    </div>
                                    <select value={entrada.categoria}
                                        onChange={(e) => setEntrada({ ...entrada, categoria: e.target.value })}
                                        className={campoCls}>
                                        <option value="">— escolher —</option>
                                        {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Forma de pagamento</label>
                                    <select value={entrada.forma_pagamento}
                                        onChange={(e) => setEntrada({ ...entrada, forma_pagamento: e.target.value })}
                                        className={campoCls}>
                                        <option value="">— escolher —</option>
                                        {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Valor (Kz) *</label>
                                <input type="text" inputMode="decimal" required value={entrada.valor}
                                    onChange={(e) => setEntrada({ ...entrada, valor: formatarMoedaInput(e.target.value) })}
                                    onBlur={() => setEntrada(prev => ({ ...prev, valor: normalizarMoeda(prev.valor) }))}
                                    className={campoCls} placeholder="0,00" />
                            </div>
                            <div className="flex gap-3 pt-5 border-t border-gray-100">
                                <button type="button" onClick={fecharModal}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">Registar Entrada</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Nova Despesa */}
            {modal === "despesa" && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Nova Despesa</h2>
                            <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCriarDespesa} className="p-8 space-y-5 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Data</label>
                                    <input type="date" value={despesa.data}
                                        onChange={(e) => setDespesa({ ...despesa, data: e.target.value })}
                                        className={campoCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Conta bancária *</label>
                                    <select value={despesa.conta_bancaria_id} onChange={(e) => setDespesa({ ...despesa, conta_bancaria_id: e.target.value })}
                                        className={campoCls}>
                                        {contas.length === 0 && <option value="">Nenhuma conta registada</option>}
                                        {contas.map(c => <option key={c.id} value={c.id}>{nomeConta(c.id)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Descrição da despesa *</label>
                                <input type="text" value={despesa.descricao}
                                    onChange={(e) => setDespesa({ ...despesa, descricao: e.target.value })}
                                    className={campoCls} placeholder="Ex: Compra de material" />
                            </div>
                            <div>
                                <label className={labelCls}>Destinatário</label>
                                <input type="text" value={despesa.destinatario}
                                    onChange={(e) => setDespesa({ ...despesa, destinatario: e.target.value })}
                                    className={campoCls} placeholder="A quem foi atribuído o material / serviço" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className={labelCls + " mb-0"}>Categoria</label>
                                        <button type="button" onClick={abrirCategorias}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700">Gerir categorias</button>
                                    </div>
                                    <select value={despesa.categoria}
                                        onChange={(e) => setDespesa({ ...despesa, categoria: e.target.value })}
                                        className={campoCls}>
                                        <option value="">— escolher —</option>
                                        {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Forma de pagamento</label>
                                    <select value={despesa.forma_pagamento}
                                        onChange={(e) => setDespesa({ ...despesa, forma_pagamento: e.target.value })}
                                        className={campoCls}>
                                        <option value="">— escolher —</option>
                                        {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Valor (Kz) *</label>
                                <input type="text" inputMode="decimal" required value={despesa.valor}
                                    onChange={(e) => setDespesa({ ...despesa, valor: formatarMoedaInput(e.target.value) })}
                                    onBlur={() => setDespesa(prev => ({ ...prev, valor: normalizarMoeda(prev.valor) }))}
                                    className={campoCls} placeholder="0,00" />
                            </div>
                            <div className="flex gap-3 pt-5 border-t border-gray-100">
                                <button type="button" onClick={fecharModal}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">Registar Despesa</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Movimento */}
            {modal === "editar" && editandoMov && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-blue-900 to-blue-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Edit className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        Editar {editandoMov.tipo === "Entrada" ? "Entrada" : "Despesa"}
                                    </h2>
                                    <p className="text-xs text-blue-100">{editandoMov.numero ? `Nº ${editandoMov.numero}` : "Actualizar dados do movimento"}</p>
                                </div>
                            </div>
                            <button onClick={fecharModal} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleAtualizarMov} className="p-8 space-y-5 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Data</label>
                                    <input type="date" value={editForm.data}
                                        onChange={(e) => setEditForm({ ...editForm, data: e.target.value })}
                                        className={campoCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Conta bancária</label>
                                    <select value={editForm.conta_bancaria_id} onChange={(e) => setEditForm({ ...editForm, conta_bancaria_id: e.target.value })}
                                        className={campoCls}>
                                        <option value="">— sem conta —</option>
                                        {contas.map(c => <option key={c.id} value={c.id}>{nomeConta(c.id)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Descrição *</label>
                                <input type="text" required value={editForm.descricao}
                                    onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                                    className={campoCls} placeholder="Descrição do movimento" />
                            </div>
                            {editandoMov.tipo === "Saida" && (
                                <div>
                                    <label className={labelCls}>Destinatário</label>
                                    <input type="text" value={editForm.destinatario}
                                        onChange={(e) => setEditForm({ ...editForm, destinatario: e.target.value })}
                                        className={campoCls} placeholder="A quem foi atribuído o material / serviço" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Categoria</label>
                                    <select value={editForm.categoria}
                                        onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                                        className={campoCls}>
                                        <option value="">— escolher —</option>
                                        {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Forma de pagamento</label>
                                    <select value={editForm.forma_pagamento}
                                        onChange={(e) => setEditForm({ ...editForm, forma_pagamento: e.target.value })}
                                        className={campoCls}>
                                        <option value="">— escolher —</option>
                                        {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Valor (Kz) *</label>
                                <input type="text" inputMode="decimal" required value={editForm.valor}
                                    onChange={(e) => setEditForm({ ...editForm, valor: formatarMoedaInput(e.target.value) })}
                                    onBlur={() => setEditForm(prev => ({ ...prev, valor: normalizarMoeda(prev.valor) }))}
                                    className={campoCls} placeholder="0,00" />
                            </div>
                            <div className="flex gap-3 pt-5 border-t border-gray-100">
                                <button type="button" onClick={fecharModal}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors">Guardar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Nova/Editar Conta */}
            {modal === "conta" && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">{editandoConta ? "Editar Conta Bancária" : "Nova Conta Bancária"}</h2>
                            <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleGuardarConta} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className={labelCls}>Banco *</label>
                                <input type="text" value={conta.banco}
                                    onChange={(e) => setConta({ ...conta, banco: e.target.value })}
                                    className={campoCls} placeholder="Ex: BFA, BAI" />
                            </div>
                            <div>
                                <label className={labelCls}>Nº da conta</label>
                                <input type="text" value={conta.numero_conta}
                                    onChange={(e) => setConta({ ...conta, numero_conta: e.target.value })}
                                    className={campoCls} placeholder="Ex: 000123456789" />
                            </div>
                            <div>
                                <label className={labelCls}>Titular</label>
                                <input type="text" value={conta.titular}
                                    onChange={(e) => setConta({ ...conta, titular: e.target.value })}
                                    className={campoCls} placeholder="Nome do titular" />
                            </div>
                            <div className="flex gap-3 pt-5 border-t border-gray-100">
                                <button type="button" onClick={fecharModal}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-sm transition-colors">
                                    {editandoConta ? "Guardar Alterações" : "Cadastrar Conta"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Gerir Categorias */}
            {modalCategorias && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-purple-600 to-purple-500">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Gerir Categorias</h2>
                                    <p className="text-xs text-purple-100">Categorias para entradas e despesas</p>
                                </div>
                            </div>
                            <button onClick={() => setModalCategorias(false)} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleGuardarCategoria} className="p-8 border-b border-gray-100">
                            <label className={labelCls}>
                                {editandoCategoria ? "Editar categoria" : "Nova categoria"}
                            </label>
                            <div className="flex gap-2">
                                <input type="text" value={categoriaNome} autoFocus
                                    onChange={(e) => setCategoriaNome(e.target.value)}
                                    className={campoCls} placeholder="Ex: Material, Transporte" />
                                <button type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium whitespace-nowrap">
                                    {editandoCategoria ? "Guardar" : "Adicionar"}
                                </button>
                            </div>
                            {editandoCategoria && (
                                <button type="button" onClick={cancelarEdicaoCategoria}
                                    className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-700">Cancelar edição</button>
                            )}
                        </form>

                        <div className="p-6 overflow-y-auto">
                            {categorias.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center">Nenhuma categoria cadastrada.</p>
                            ) : (
                                <div className="space-y-2">
                                    {categorias.map((c) => (
                                        <div key={c.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                                            <span className="text-sm font-medium text-gray-900">{c.nome}</span>
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={() => abrirEditarCategoria(c)} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                                                <button type="button" onClick={() => handleEliminarCategoria(c)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}