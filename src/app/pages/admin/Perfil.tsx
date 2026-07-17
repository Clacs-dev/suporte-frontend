import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Save, ArrowLeft } from "lucide-react";
import { authAPI } from "../../services/api";
import { toast } from "sonner";

export default function AdminPerfil() {
    const navigate = useNavigate();
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
        <div className="max-w-lg mx-auto space-y-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            <div>
                <h1 className="text-3xl font-bold text-gray-900">Minhas Credenciais</h1>
                <p className="text-gray-600 mt-1">Atualize o seu nome, email ou senha de acesso</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                    <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3 mt-3">Alterar Senha (opcional)</p>

                    <label className="block text-sm font-medium text-gray-700 mb-2">Nova Senha</label>
                    <div className="relative mb-4">
                        <input type={mostrarSenha ? "text" : "password"} autoComplete="new-password" value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            placeholder="Deixe em branco para não alterar"
                            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {novaSenha && (
                        <>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Senha</label>
                            <input type={mostrarSenha ? "text" : "password"} autoComplete="new-password" value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </>
                    )}
                </div>

                <button type="submit" disabled={salvando}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
                    <Save className="w-4 h-4" />
                    {salvando ? 'A guardar...' : 'Guardar Alterações'}
                </button>
            </form>
        </div>
    );
}