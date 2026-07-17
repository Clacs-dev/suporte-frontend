import { useState } from "react";
import { Eye, EyeOff, Save, X } from "lucide-react";
import { authAPI } from "../services/api";
import { toast } from "sonner";

export default function PerfilDropdown({ onClose }: { onClose: () => void }) {
    const [nome, setNome] = useState(localStorage.getItem('userName') || '');
    const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (novaSenha && novaSenha !== confirmarSenha) {
            toast.error('As senhas não coincidem.');
            return;
        }
        if (novaSenha && novaSenha.length < 5) {
            toast.error('A nova senha deve ter pelo menos 5 caracteres.');
            return;
        }

        setSalvando(true);
        try {
            const payload: any = { nome, email };
            if (novaSenha) payload.nova_senha = novaSenha;

            const response = await authAPI.updateProfile(payload);
            if (response.success) {
                localStorage.setItem('userName', response.data.nome);
                localStorage.setItem('userEmail', response.data.email);
                toast.success('Credenciais atualizadas com sucesso!');
                setNovaSenha('');
                setConfirmarSenha('');
                onClose();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast.error(response.error || 'Erro ao atualizar credenciais');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar credenciais');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <>
            {/* Overlay invisível para fechar ao clicar fora */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                {/* Cabeçalho estilo "cartão de perfil" */}
                <div className="bg-gray-50 p-6 text-center border-b border-gray-200 relative">
                    <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold mb-3">
                        {(nome || 'U').charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold text-gray-900">{nome}</p>
                    <p className="text-sm text-gray-500">{email}</p>
                </div>

                {/* Formulário de edição */}
                <form onSubmit={handleSubmit} className="p-5 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                        <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <label className="block text-xs font-medium text-gray-700 mb-1 mt-2">Nova Senha</label>
                        <div className="relative mb-2">
                            <input type={mostrarSenha ? "text" : "password"} autoComplete="new-password" value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                placeholder="Alterar senha"
                                className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {novaSenha && (
                            <>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                                <input type={mostrarSenha ? "text" : "password"} autoComplete="new-password" value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </>
                        )}
                    </div>

                    <button type="submit" disabled={salvando}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors">
                        <Save className="w-4 h-4" />
                        {salvando ? 'A guardar...' : 'Guardar Alterações'}
                    </button>
                </form>
            </div>
        </>
    );
}