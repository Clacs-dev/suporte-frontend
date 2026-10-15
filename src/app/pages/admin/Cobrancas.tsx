import React, { useState, useEffect } from "react";
import { cobrancasAPI } from "../../services/api";
import { formatarMoedaInput, normalizarMoeda, parseMoeda, formatarMoedaExibicao, numeroParaMoedaInput, MAX_DECIMAIS } from "../../services/moeda";
import { toast } from "sonner";
import { Loader, HandCoins, CheckCircle2, XCircle, Users, Wallet, ChevronLeft, ChevronRight, Download, History, Search, AlertCircle, CalendarDays, Save } from "lucide-react";

// Pelo menos 2 casas decimais; mostra as restantes quando o valor as tiver
const fmt = (v: number) => formatarMoedaExibicao(v, 2, MAX_DECIMAIS) + " Kz";
const API_BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://suporte-backend-l9hm.onrender.com";

type Edit = { pago: boolean; valor: string; data_pagamento: string; observacao: string };
const EDIT_VAZIO: Edit = { pago: false, valor: "", data_pagamento: "", observacao: "" };
const hojeISO = () => new Date().toISOString().slice(0, 10);

// Valor formatado, ou "" quando vazio/zero (para não guardar nem marcar alterações por "0,00")
const normValor = (v: string) => {
    const n = parseMoeda(v);
    return !v || isNaN(n) || n === 0 ? "" : normalizarMoeda(v);
};

// Valores tal como estão guardados no servidor, no formato do formulário
const editDoServidor = (c: any): Edit => ({
    pago: !!c.pago,
    valor: c.valor ? numeroParaMoedaInput(c.valor) : "",
    data_pagamento: c.data_pagamento ? String(c.data_pagamento).slice(0, 10) : "",
    observacao: c.observacao || "",
});

export default function AdminCobrancas() {
    const hoje = new Date();
    const [mes, setMes] = useState(hoje.getMonth() + 1);
    const [ano, setAno] = useState(hoje.getFullYear());
    const [dados, setDados] = useState<any>({ clientes: [], stats: { total_clientes: 0, pagantes: 0, nao_pagantes: 0, total_cobrado: 0, total_pago: 0, total_contratual: 0, total_nao_pago: 0 } });
    const [loading, setLoading] = useState(true);
    const [edits, setEdits] = useState<Record<string, Edit>>({});
    const [historico, setHistorico] = useState<any>({ clientes: [], meses: [] });
    const [busca, setBusca] = useState("");
    const [aba, setAba] = useState<"mapa" | "pagamentos" | "historico">("mapa");
    const [filtroStatus, setFiltroStatus] = useState<"todos" | "pago" | "nao_pago">("todos");
    const [aGuardar, setAGuardar] = useState(false);

    useEffect(() => { carregar(); }, [mes, ano]);
    useEffect(() => { carregarHistorico(); }, []);

    const carregarHistorico = async () => {
        try {
            const res = await cobrancasAPI.historico();
            if (res.success && res.data) setHistorico(res.data);
        } catch (error) {
            console.error("Erro ao carregar histórico de cobranças:", error);
        }
    };

    const abrirRelatorioMapa = () => {
        window.open(`${API_BASE_URL}/relatorios/cobrancas?mes=${mes}&ano=${ano}`, '_blank');
    };

    const abrirRelatorioHistorico = () => {
        window.open(`${API_BASE_URL}/relatorios/cobrancas/historico`, '_blank');
    };

    const carregar = async (preservarEdits = false) => {
        try {
            setLoading(true);
            const res = await cobrancasAPI.mapa(mes, ano);
            if (res.success && res.data) {
                setDados(res.data);
                if (preservarEdits) return;
                const map: Record<string, Edit> = {};
                (res.data.clientes || []).forEach((c: any) => { map[c.id] = editDoServidor(c); });
                setEdits(map);
            }
        } catch (error) {
            console.error("Erro ao carregar mapa de cobranças:", error);
        } finally {
            setLoading(false);
        }
    };

    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // ---- Alterações por guardar ----

    const editDe = (c: any): Edit => edits[c.id] || EDIT_VAZIO;
    const temAlteracoes = (c: any) => {
        const e = editDe(c), s = editDoServidor(c);
        return e.pago !== s.pago || normValor(e.valor) !== s.valor || e.data_pagamento !== s.data_pagamento || e.observacao !== s.observacao;
    };
    const clientesAlterados = (dados.clientes || []).filter(temAlteracoes);

    const confirmarDescartar = () =>
        clientesAlterados.length === 0 ||
        window.confirm(`Tem ${clientesAlterados.length} alteração(ões) por guardar. Deseja descartá-las?`);

    const irPara = (novoMes: number, novoAno: number) => {
        if (novoMes === mes && novoAno === ano) return;
        if (!confirmarDescartar()) return;
        setMes(novoMes);
        setAno(novoAno);
    };

    const mudarMes = (delta: number) => {
        let novoMes = mes + delta;
        let novoAno = ano;
        if (novoMes > 12) { novoMes = 1; novoAno += 1; }
        if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
        irPara(novoMes, novoAno);
    };

    const atualizarEdit = (c: any, parcial: Partial<Edit>) => {
        setEdits(prev => ({ ...prev, [c.id]: { ...(prev[c.id] || EDIT_VAZIO), ...parcial } }));
    };

    // Ao marcar como pago, preenche valor (contratual) e data (hoje) se estiverem vazios
    const togglePago = (c: any, pago: boolean) => {
        const atual = editDe(c);
        const parcial: Partial<Edit> = { pago };
        if (pago && !atual.valor && c.valor_contratual > 0) parcial.valor = normalizarMoeda(String(c.valor_contratual));
        if (pago && !atual.data_pagamento) parcial.data_pagamento = hojeISO();
        atualizarEdit(c, parcial);
    };

    const guardar = async (c: any, silencioso = false, recarregar = true): Promise<boolean> => {
        const edit = editDe(c);
        const valorNum = normValor(edit.valor) ? parseMoeda(edit.valor) : undefined;
        if (valorNum !== undefined && valorNum < 0) {
            if (!silencioso) toast.error("Insira um valor válido.");
            return false;
        }
        try {
            const res = await cobrancasAPI.salvar({
                cliente_id: c.id,
                mes,
                ano,
                pago: edit.pago,
                valor: valorNum,
                data_pagamento: edit.data_pagamento || null,
                observacao: edit.observacao || null,
            });
            if (res.success) {
                if (recarregar) {
                    toast.success(`Cobrança de ${c.nome} guardada.`);
                    carregar(true);
                    carregarHistorico();
                }
                return true;
            } else {
                if (!silencioso) toast.error(res.error || "Erro ao guardar cobrança");
                return false;
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao guardar cobrança");
            return false;
        }
    };

    const guardarTudo = async () => {
        if (clientesAlterados.length === 0) { toast.info("Não há alterações por guardar."); return; }
        setAGuardar(true);
        let ok = 0;
        for (const c of clientesAlterados) {
            if (await guardar(c, true, false)) ok++;
        }
        await carregar(true);
        carregarHistorico();
        setAGuardar(false);
        if (ok === clientesAlterados.length) toast.success(`${ok} cobrança(s) guardada(s).`);
        else toast.warning(`${ok} de ${clientesAlterados.length} cobrança(s) guardada(s). Verifique os valores das restantes.`);
    };

    const { stats } = dados;
    const totalClientes = stats.total_clientes ?? 0;
    const percPago = totalClientes ? Math.round(((stats.pagantes ?? 0) / totalClientes) * 100) : 0;
    const totalContratual = stats.total_contratual ?? 0;
    const percCobrado = totalContratual ? Math.min(100, Math.round(((stats.total_pago ?? 0) / totalContratual) * 100)) : 0;

    const termoBusca = busca.trim().toLowerCase();
    const correspondeBusca = (c: any) =>
        !termoBusca ||
        (c.nome || "").toLowerCase().includes(termoBusca) ||
        (c.email || "").toLowerCase().includes(termoBusca) ||
        (c.empresa || "").toLowerCase().includes(termoBusca);

    const clientesFiltrados = (dados.clientes || []).filter(correspondeBusca);

    const pagamentosFiltrados = (dados.clientes || []).filter((c: any) => {
        const matchStatus =
            filtroStatus === "todos" ||
            (filtroStatus === "pago" && c.pago) ||
            (filtroStatus === "nao_pago" && !c.pago);
        return matchStatus && correspondeBusca(c);
    });

    const fmtData = (d?: string) => (d ? new Date(d).toLocaleDateString("pt-AO") : "—");
    const fmtContratual = (v?: number) => (v && v > 0 ? fmt(v) : "—");

    const mesesComDados = (historico.meses || [])
        .map((m: any, i: number) => ({ m, i }))
        .filter(({ i }) =>
            (historico.clientes || []).some((c: any) => {
                const h = (c.historico || [])[i];
                return h && (h.pago || h.valor > 0 || h.data_pagamento);
            })
        );

    if (loading && (dados.clientes || []).length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Carregando mapa de cobranças...</p>
                </div>
            </div>
        );
    }

    const eMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
    const thCls = "px-4 py-3 font-semibold";

    return (
        <div className="space-y-6">
            {/* Título */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Cobranças</h1>
                <p className="text-gray-600 mt-1">Mapa mensal de controlo de pagamentos dos clientes</p>
            </div>

            {/* Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-1 text-blue-100"><Users className="w-4 h-4" /><p className="text-sm">Cliente (cobrança)</p></div>
                    <p className="text-2xl font-bold">{totalClientes}</p>
                    <p className="text-xs text-blue-100 mt-1">com contrato activo</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-1 text-green-600"><CheckCircle2 className="w-4 h-4" /><p className="text-sm text-gray-600">Pago</p></div>
                    <p className="text-2xl font-bold text-green-600">{stats.pagantes ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{percPago}% dos clientes</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-1 text-red-600"><XCircle className="w-4 h-4" /><p className="text-sm text-gray-600">Não Pago</p></div>
                    <p className="text-2xl font-bold text-red-600">{stats.nao_pagantes ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{totalClientes ? 100 - percPago : 0}% dos clientes</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-1 text-blue-600"><Wallet className="w-4 h-4" /><p className="text-sm text-gray-600">Total pago</p></div>
                    <p className="text-2xl font-bold text-blue-700">{fmt(stats.total_pago ?? 0)}</p>
                    <div className="mt-2">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${percCobrado}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{percCobrado}% do valor contratual</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-1 text-red-600"><AlertCircle className="w-4 h-4" /><p className="text-sm text-gray-600">Total Não Pago</p></div>
                    <p className="text-2xl font-bold text-red-700">{fmt(stats.total_nao_pago ?? 0)}</p>
                    <p className="text-xs text-gray-500 mt-1">valor contratual por receber</p>
                </div>
            </div>

            {/* Barra de ferramentas */}
            <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
                        placeholder="Filtrar por nome, email ou empresa..."
                        className="pl-9 pr-3 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={abrirRelatorioMapa}
                    className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium">
                    <Download className="w-4 h-4" />
                    Exportar PDF
                </button>
                <button onClick={guardarTudo} disabled={aGuardar || clientesAlterados.length === 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {aGuardar ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {aGuardar ? "A guardar..." : "Guardar alterações"}
                    {!aGuardar && clientesAlterados.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-white/25 text-xs font-semibold">{clientesAlterados.length}</span>
                    )}
                </button>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm px-1.5 py-1.5">
                    <button onClick={() => mudarMes(-1)} title="Mês anterior"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <CalendarDays className="w-4 h-4 text-gray-400 ml-1" />
                    <select value={mes} onChange={(e) => irPara(parseInt(e.target.value), ano)}
                        className="bg-transparent font-semibold text-gray-900 py-1 pl-1 pr-1 focus:outline-none cursor-pointer">
                        {nomesMeses.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
                    </select>
                    <input type="number" value={ano}
                        onChange={(e) => { const v = parseInt(e.target.value); if (v > 1999 && v < 2100) irPara(mes, v); }}
                        className="w-16 bg-transparent font-semibold text-gray-900 text-center py-1 focus:outline-none" />
                    <button onClick={() => mudarMes(1)} title="Mês seguinte"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                {!eMesAtual && (
                    <button onClick={() => irPara(hoje.getMonth() + 1, hoje.getFullYear())}
                        className="px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
                        Mês actual
                    </button>
                )}
            </div>

            {/* Abas */}
            <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
                {[
                    { id: "mapa" as const, label: "Mapa", n: totalClientes },
                    { id: "pagamentos" as const, label: "Pagamentos", n: stats.pagantes ?? 0 },
                    { id: "historico" as const, label: "Histórico", n: null },
                ].map(t => (
                    <button key={t.id} onClick={() => setAba(t.id)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${aba === t.id ? "bg-white shadow-sm text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
                        {t.label}
                        {t.n !== null && (
                            <span className={`px-1.5 py-0.5 rounded-md text-xs ${aba === t.id ? "bg-blue-50 text-blue-700" : "bg-gray-200 text-gray-600"}`}>{t.n}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tabela de cobranças */}
            {aba === "mapa" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><HandCoins className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Mapa de Cobranças — {nomesMeses[mes - 1]} {ano}</h3>
                            <p className="text-xs text-gray-500">Ao marcar "Sim", o valor contratual e a data de hoje são preenchidos automaticamente</p>
                        </div>
                    </div>
                    {clientesAlterados.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {clientesAlterados.length} alteração(ões) por guardar
                        </span>
                    )}
                </div>

                {clientesFiltrados.length === 0 ? (
                    <div className="py-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">{termoBusca ? "Nenhum cliente encontrado para a pesquisa." : "Nenhum cliente activo encontrado."}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-gray-50">
                                    <th className={thCls}>Cliente</th>
                                    <th className={thCls}>Responsável</th>
                                    <th className={thCls}>Pago?</th>
                                    <th className={thCls + " text-right"}>Valor Contratual</th>
                                    <th className={thCls}>Valor (Kz)</th>
                                    <th className={thCls}>Data de pagamento</th>
                                    <th className={thCls}>Observações</th>
                                    <th className={thCls + " text-right"}>Acções</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFiltrados.map((c: any) => {
                                    const edit = editDe(c);
                                    const alterado = temAlteracoes(c);
                                    return (
                                        <tr key={c.id} className={`border-b border-gray-100 last:border-0 transition-colors ${alterado ? "bg-amber-50/60" : edit.pago ? "bg-green-50/40" : "hover:bg-gray-50"}`}>
                                            <td className={`px-4 py-3 border-l-4 ${alterado ? "border-amber-400" : "border-transparent"}`}>
                                                <p className="font-medium text-gray-900">{c.empresa || ""}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                <p className="font-medium text-gray-900">{c.nome}</p>
                                                {c.email ? <p className="text-xs text-gray-500">{c.email}</p> : null}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => togglePago(c, !edit.pago)}
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                                        edit.pago
                                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                                    }`}
                                                >
                                                    {edit.pago ? <><CheckCircle2 className="w-4 h-4" /> Sim</> : <><XCircle className="w-4 h-4" /> Não</>}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">{fmtContratual(c.valor_contratual)}</td>
                                            <td className="px-4 py-3">
                                                <input type="text" inputMode="decimal" value={edit.valor}
                                                    onChange={(e) => atualizarEdit(c, { valor: formatarMoedaInput(e.target.value) })}
                                                    onBlur={() => atualizarEdit(c, { valor: normValor(edit.valor) })}
                                                    placeholder={c.valor_contratual > 0 ? normalizarMoeda(String(c.valor_contratual)) : "0,00"}
                                                    className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input type="date" value={edit.data_pagamento}
                                                    onChange={(e) => atualizarEdit(c, { data_pagamento: e.target.value })}
                                                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input type="text" value={edit.observacao}
                                                    onChange={(e) => atualizarEdit(c, { observacao: e.target.value })}
                                                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full min-w-[120px]" />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => guardar(c)} disabled={!alterado}
                                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
                                                    Guardar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 p-4 bg-gray-50 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">Valor contratual total</p><p className="font-semibold text-gray-900 mt-0.5">{fmt(totalContratual)}</p></div>
                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">Total recebido</p><p className="font-semibold text-green-600 mt-0.5">{fmt(stats.total_pago ?? 0)}</p></div>
                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">Total não pago</p><p className="font-semibold text-red-600 mt-0.5">{fmt(stats.total_nao_pago ?? 0)}</p></div>
                </div>
            </div>
            )}

            {/* Pagamentos — quem pagou */}
            {aba === "pagamentos" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Quem Pagou? — {nomesMeses[mes - 1]} {ano}</h3>
                            <p className="text-xs text-gray-500">Filtre para ver quem pagou, quando e quem ainda falta pagar</p>
                        </div>
                    </div>
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {[
                            { id: "todos" as const, label: "Todos" },
                            { id: "pago" as const, label: "Pago" },
                            { id: "nao_pago" as const, label: "Não Pago" },
                        ].map(f => (
                            <button key={f.id} onClick={() => setFiltroStatus(f.id)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtroStatus === f.id ? "bg-white shadow-sm text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {pagamentosFiltrados.length === 0 ? (
                    <div className="py-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhum cliente encontrado para o filtro seleccionado.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-gray-50">
                                    <th className={thCls}>Cliente</th>
                                    <th className={thCls}>Responsável</th>
                                    <th className={thCls}>Situação</th>
                                    <th className={thCls + " text-right"}>Valor Contratual</th>
                                    <th className={thCls + " text-right"}>Valor</th>
                                    <th className={thCls}>Data de pagamento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosFiltrados.map((c: any) => (
                                    <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-700">{c.empresa || ""}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{c.nome}</p>
                                            {c.email ? <p className="text-xs text-gray-500">{c.email}</p> : null}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.pago ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                {c.pago ? <><CheckCircle2 className="w-4 h-4" /> Pago</> : <><XCircle className="w-4 h-4" /> Não Pago</>}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">{fmtContratual(c.valor_contratual)}</td>
                                        <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${c.pago ? "text-green-700" : "text-red-700"}`}>
                                            {c.valor > 0 ? fmt(c.valor) : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{c.pago ? fmtData(c.data_pagamento) : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 p-4 bg-gray-50 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">Pago</p><p className="font-semibold text-green-600 mt-0.5">{pagamentosFiltrados.filter((c: any) => c.pago).length}</p></div>
                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">Não pago</p><p className="font-semibold text-red-600 mt-0.5">{pagamentosFiltrados.filter((c: any) => !c.pago).length}</p></div>
                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">Total não pago</p><p className="font-semibold text-red-600 mt-0.5">{fmt(pagamentosFiltrados.filter((c: any) => !c.pago).reduce((s: number, c: any) => s + (c.valor_contratual || 0), 0))}</p></div>
                </div>
            </div>
            )}

            {/* Histórico de pagamentos */}
            {aba === "historico" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><History className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Histórico de Pagamentos por Cliente</h3>
                            <p className="text-xs text-gray-500">Meses com registo de cobranças</p>
                        </div>
                    </div>
                    <button onClick={abrirRelatorioHistorico}
                        className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium">
                        <Download className="w-4 h-4" />
                        Exportar Histórico (PDF)
                    </button>
                </div>

                {historico.clientes.length === 0 || mesesComDados.length === 0 ? (
                    <div className="py-12 text-center">
                        <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhum dado histórico disponível.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-gray-50">
                                        <th className={thCls + " sticky left-0 bg-gray-50"}>Cliente</th>
                                        <th className={thCls + " sticky left-[180px] bg-gray-50"}>Responsável</th>
                                        {mesesComDados.map(({ m }: any) => (
                                            <th key={`${m.mes}-${m.ano}`} className="px-2 py-3 text-center font-semibold">
                                                {String(m.mes).padStart(2, "0")}/{m.ano}
                                            </th>
                                        ))}
                                        <th className={thCls + " text-right"}>Total pagou</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historico.clientes.map((c: any) => {
                                        const hist = mesesComDados.map(({ i }: any) => (c.historico || [])[i]);
                                        const totalPago = hist.filter((h: any) => h && h.pago).reduce((s: number, h: any) => s + (h.valor || 0), 0);
                                        return (
                                            <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">{c.empresa || ""}</td>
                                                <td className="px-4 py-3 text-gray-700 sticky left-[180px] bg-white">{c.nome}</td>
                                                {hist.map((h: any, i: number) => (
                                                    <td key={i} className="px-2 py-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                            h && h.pago ? "bg-green-100 text-green-700" :
                                                            h && (h.valor > 0 || h.data_pagamento) ? "bg-red-100 text-red-700" :
                                                            "bg-gray-100 text-gray-500"
                                                        }`}>
                                                            {h && h.pago ? "Sim" : (h && (h.valor > 0 || h.data_pagamento) ? "Não" : "")}
                                                        </span>
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">{fmt(totalPago)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-100 inline-block"></span> Sim = pagou naquele mês</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-100 inline-block"></span> Não = não pagou naquele mês</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-100 inline-block"></span> vazio = sem registo naquele mês</span>
                        </div>
                    </>
                )}
            </div>
            )}
        </div>
    );
}
