import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle, Info, AlertTriangle, Check } from "lucide-react";
import { notificacoesAPI } from "../services/api";

interface Notificacao {
    id: string;
    titulo: string;
    mensagem?: string;
    tipo: string;
    lida: boolean;
    dataCriacao: string;
}

const ICONES: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />,
};

function tempoRelativo(dataStr: string) {
    const agora = new Date();
    const data = new Date(dataStr.endsWith('Z') || dataStr.includes('+') ? dataStr : dataStr + 'Z');
    const diffMin = Math.floor((agora.getTime() - data.getTime()) / 60000);
    if (diffMin < 1) return "agora mesmo";
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `há ${diffD}d`;
}

export default function NotificacaoSino() {
    const [aberto, setAberto] = useState(false);
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [naoLidas, setNaoLidas] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const carregar = async () => {
        try {
            const res = await notificacoesAPI.listar();
            if (res.success) {
                setNotificacoes(res.data.notificacoes);
                setNaoLidas(res.data.naoLidas);
            }
        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
        }
    };

    useEffect(() => {
        carregar();
        const intervalo = setInterval(carregar, 15000); // polling a cada 15s
        return () => clearInterval(intervalo);
    }, []);

    const handleMarcarLida = async (id: string) => {
        await notificacoesAPI.marcarLida(id);
        carregar();
    };

    const handleMarcarTodasLidas = async () => {
        await notificacoesAPI.marcarTodasLidas();
        carregar();
    };

    return (
        <div className="relative" ref={containerRef}>
            <button onClick={() => setAberto(!aberto)} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                {naoLidas > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {naoLidas > 9 ? "9+" : naoLidas}
                    </span>
                )}
            </button>

            {aberto && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <p className="font-semibold text-gray-900">Notificações</p>
                            {naoLidas > 0 && (
                                <button onClick={handleMarcarTodasLidas} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Marcar todas como lidas
                                </button>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {notificacoes.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">Sem notificações</p>
                            ) : (
                                notificacoes.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => !n.lida && handleMarcarLida(n.id)}
                                        className={`w-full text-left flex items-start gap-2 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.lida ? "bg-blue-50/50" : ""}`}
                                    >
                                        {ICONES[n.tipo] || ICONES.info}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!n.lida ? "font-semibold text-gray-900" : "text-gray-700"}`}>{n.titulo}</p>
                                            {n.mensagem && <p className="text-xs text-gray-500 mt-0.5">{n.mensagem}</p>}
                                            <p className="text-xs text-gray-400 mt-1">{tempoRelativo(n.dataCriacao)}</p>
                                        </div>
                                        {!n.lida && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}