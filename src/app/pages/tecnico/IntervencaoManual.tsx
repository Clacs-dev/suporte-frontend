import { Clock, Save, Calendar, Loader } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { intervencoesAPI, registrosHorasAPI, tecnicosAPI } from "../../services/api";

interface Intervencao { id: string; numero: string; titulo: string; status: string; }
interface RegistroHoras { id: string; intervencaoId?: string; data: string; horas: number; horaInicio?: string; horaFim?: string; hora_inicio?: string; hora_fim?: string; descricao?: string; }

const STATUS_FECHADOS = ["Resolvido", "Fechado", "Concluído"];

export default function TecnicoIntervencaoManual() {
    const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
    const [todasIntervencoes, setTodasIntervencoes] = useState<Intervencao[]>([]);
    const [registros, setRegistros] = useState<RegistroHoras[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
    const [tecnicoId, setTecnicoId] = useState<string | null>(null);
    const [descricao, setDescricao] = useState("");
    const [intervId, setIntervId] = useState("");
    const [horaInicio, setHoraInicio] = useState("");
    const [horaFim, setHoraFim] = useState("");
    const [salvando, setSalvando] = useState(false);

    const usuarioId = localStorage.getItem("userId");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const intervencaoIdUrl = searchParams.get("intervencaoId");

    const carregarDados = useCallback(async (tId: string) => {
        const [ir, rr] = await Promise.all([
            intervencoesAPI.listarPorTecnico(tId),
            registrosHorasAPI.listarPorTecnico(tId),
        ]);
        if (ir.success) {
            setTodasIntervencoes(ir.data);
            setIntervencoes(ir.data.filter((i: any) => !STATUS_FECHADOS.includes(i.status)));
        }
        if (rr.success) setRegistros(rr.data);
        setLoading(false);
    }, []);

    useEffect(() => {
        (async () => {
            if (!usuarioId) { setLoading(false); return; }
            try {
                const tr = await tecnicosAPI.buscarPorUsuarioId(usuarioId);
                if (tr.success && tr.data?.id) {
                    setTecnicoId(tr.data.id);
                    await carregarDados(tr.data.id);
                } else {
                    setLoading(false);
                }
            } catch { setLoading(false); }
        })();
    }, [usuarioId, carregarDados]);

    useEffect(() => {
        if (intervencaoIdUrl && intervencoes.some(i => i.id === intervencaoIdUrl)) {
            setIntervId(intervencaoIdUrl);
        }
    }, [intervencoes, intervencaoIdUrl]);

    const handleGuardar = async () => {
        if (!intervId) return setMsg({ tipo: "erro", texto: "Selecione uma intervenção." });
        if (!horaInicio || !horaFim) return setMsg({ tipo: "erro", texto: "Preencha a hora de início e fim." });

        const [h1, m1] = horaInicio.split(":").map(Number);
        const [h2, m2] = horaFim.split(":").map(Number);
        const totalMin = h2 * 60 + m2 - (h1 * 60 + m1);
        if (totalMin <= 0) return setMsg({ tipo: "erro", texto: "A hora de fim deve ser posterior à de início." });
        if (!descricao.trim()) return setMsg({ tipo: "erro", texto: "A descrição é obrigatória." });
        const totalHoras = totalMin / 60;
        setSalvando(true);

        try {
            await registrosHorasAPI.criar({
                intervencao_id: intervId,
                tecnico_id: tecnicoId!,
                horas: totalHoras,
                hora_inicio: horaInicio,
                hora_fim: horaFim,
                descricao,
                data: new Date().toISOString().split("T")[0],
            });
            await intervencoesAPI.atualizarStatus(intervId, "Resolvido");
            setMsg({ tipo: "sucesso", texto: "Intervenção resolvida com sucesso!" });
            setTimeout(() => navigate("/tecnico/intervencoes"), 1500);
            setIntervId("");
            setHoraInicio("");
            setHoraFim("");
            setDescricao("");
            if (tecnicoId) await carregarDados(tecnicoId);
        } catch {
            setMsg({ tipo: "erro", texto: "Erro ao guardar. Tente novamente." });
        } finally {
            setSalvando(false);
        }
    };

    const totalHoje = registros
        .filter(r => (r.data || "").startsWith(new Date().toISOString().split("T")[0]))
        .reduce((s, r) => s + (r.horas || 0), 0);

    const totalSemana = registros
        .filter(r => {
            const d = new Date(r.data || "");
            const agora = new Date();
            const diff = (agora.getTime() - d.getTime()) / 86400000;
            return diff <= 7;
        })
        .reduce((s, r) => s + (r.horas || 0), 0);

    const totalMes = registros
        .filter(r => {
            const d = new Date(r.data || "");
            const agora = new Date();
            return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
        })
        .reduce((s, r) => s + (r.horas || 0), 0);

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="text-center">
                <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Carregando...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Resolução Manual</h1>
                <p className="text-gray-600 mt-1">Registe manualmente as horas de início e fim</p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Hoje", value: totalHoje },
                    { label: "Esta Semana", value: totalSemana },
                    { label: "Este Mês", value: totalMes },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{s.value.toFixed(1)}h</p>
                        <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Formulário */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock size={20} className="text-blue-600" />
                    Registo Manual
                </h2>

                {msg && (
                    <div className={`rounded-lg p-3 text-sm ${msg.tipo === "sucesso" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                        {msg.texto}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intervenção</label>
                    <select
                        value={intervId}
                        onChange={e => setIntervId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                        <option value="">Escolha uma intervenção...</option>
                        {intervencoes.map(i => (
                            <option key={i.id} value={i.id}>{i.numero}: {i.titulo}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Início</label>
                        <input
                            type="time"
                            value={horaInicio}
                            onChange={e => setHoraInicio(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Fim</label>
                        <input
                            type="time"
                            value={horaFim}
                            onChange={e => setHoraFim(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {horaInicio && horaFim && (() => {
                    const [h1, m1] = horaInicio.split(":").map(Number);
                    const [h2, m2] = horaFim.split(":").map(Number);
                    const totalMin = h2 * 60 + m2 - (h1 * 60 + m1);
                    const horas = Math.floor(Math.abs(totalMin) / 60);
                    const minutos = Math.abs(totalMin) % 60;
                    return totalMin > 0 ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-blue-600 mb-1">Total calculado</p>
                            <p className="text-2xl font-bold text-blue-700">{horas}h {minutos}m</p>
                        </div>
                    ) : null;
                })()}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Solução *</label>
                    <textarea
                        rows={4}
                        required
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Descreva o que foi feito para resolver o problema..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                    />
                </div>

                <button
                    onClick={handleGuardar}
                    disabled={salvando}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Save size={16} />
                    {salvando ? "A guardar..." : "Guardar e Resolver"}
                </button>
            </div>

            {/* Histórico */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar size={18} className="text-gray-500" />
                        Histórico de Registos
                    </h2>
                </div>
                {registros.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Sem registos ainda.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Data", "Intervenção", "Período", "Descrição", "Horas"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {registros.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-600">
                                            {new Date(r.data).toLocaleDateString("pt-PT")}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {todasIntervencoes.find(i => i.id === (r.intervencaoId || (r as any).intervencao_id))?.titulo || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {(r.horaInicio || r.hora_inicio) && (r.horaFim || r.hora_fim)
                                                ? `${r.horaInicio || r.hora_inicio} – ${r.horaFim || r.hora_fim}`
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.descricao || "—"}</td>
                                        <td className="px-4 py-3 font-medium text-blue-600">{(r.horas || 0).toFixed(2)}h</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
