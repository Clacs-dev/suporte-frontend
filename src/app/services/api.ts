const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://suporte-backend-l9hm.onrender.com";
// Obter token de autenticação do localStorage
function getAuthToken() {
  return localStorage.getItem('access_token');
}

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/seed-data', '/clear-data', '/fix-user-links', '/migrate-status'];

// Rotas que devem usar publicAnonKey em vez de token do usuário (incluindo rotas de escrita)
const PUBLIC_READ_ROUTES = [
  '/clientes',
  '/tecnicos',
  '/contratos',
  '/intervencoes',
  '/registros-horas',
  '/stats/dashboard'
];

// Função auxiliar para fazer requisições
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAuthToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[API] Fazendo requisição para: ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`[API] Status da resposta:`, response.status);

    let data = null;

    // evita erro em respostas vazias
    const text = await response.text();

    if (text) {
      data = JSON.parse(text);
    }

    console.log(`[API] Dados da resposta:`, data);

    if (!response.ok) {
      console.error(`Erro na API (${endpoint}):`, data);

      throw new Error(
        data?.error || 'Erro na requisição'
      );
    }

    return data;

  } catch (error) {
    console.error(`Erro ao chamar API (${endpoint}):`, error);
    throw error;
  }
}

// ====================================
// AUTENTICAÇÃO
// ====================================

export const authAPI = {
  signup: async (userData: {
    email: string;
    password: string;
    nome: string;
    tipo: 'admin' | 'tecnico' | 'cliente';
  }) => {
    try {
      return await fetchAPI('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    } catch (error: any) {
      // Retornar erro de forma silenciosa para signup
      return {
        success: false,
        error: error.message || 'Erro ao criar conta'
      };
    }
  },

  login: async (credentials: { email: string; password: string }) => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getProfile: async () => {
    return fetchAPI('/auth/profile');
  },

  updateProfile: async (profileData: Partial<any>) => {
    return fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  logout: async () => {
    return fetchAPI('/auth/logout', {
      method: 'POST',
    });
  },
};

// ====================================
// CLIENTES
// ====================================

export const clientesAPI = {
  listar: async () => {
    return fetchAPI('/clientes');
  },

  buscar: async (id: string) => {
    return fetchAPI(`/clientes/${id}`);
  },

  buscarPorUsuarioId: async (usuarioId: string) => {
    return fetchAPI(`/clientes/usuario/${usuarioId}`);
  },

  criar: async (cliente: {
    nome: string;
    email: string;
    telefone?: string;
    senha?: string;
    status?: string;
    tipo_cliente?: string;
    empresa?: string;
  }) => {
    console.log('=== API FRONTEND: clientesAPI.criar() chamado ===');
    console.log('Dados recebidos:', {
      ...cliente,
      senha: cliente.senha ? `[${cliente.senha.length} caracteres]` : 'VAZIO'
    });
    console.log('Senha presente?', !!cliente.senha);
    console.log('Tamanho da senha:', cliente.senha?.length);

    const result = await fetchAPI('/clientes', {
      method: 'POST',
      body: JSON.stringify(cliente),
    });

    console.log('=== Resultado da criação do cliente ===');
    console.log('usuario_id:', result.data?.usuario_id);
    console.log('Cliente criado:', result.data?.id);

    return result;
  },

  atualizar: async (id: string, cliente: Partial<any>) => {
    return fetchAPI(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cliente),
    });
  },

  deletar: async (id: string) => {
    return fetchAPI(`/clientes/${id}`, {
      method: 'DELETE',
    });
  },
};

// ====================================
// CONTRATOS
// ====================================

export const contratosAPI = {
  listar: async () => {
    return fetchAPI('/contratos');
  },

  listarPorCliente: async (clienteId: string) => {
    return fetchAPI(`/contratos/cliente/${clienteId}`);
  },

  criar: async (contrato: {
    clienteId: string;
    tipo: string;
    horasContratadas?: number;
    valorMensal?: number;
    dataInicio?: string;
    dataFim?: string | null;
  }) => {
    return fetchAPI('/contratos', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: contrato.clienteId,
        tipo: contrato.tipo,
        horas_contratadas: contrato.horasContratadas,
        valor_mensal: contrato.valorMensal,
        data_inicio: contrato.dataInicio,
        data_fim: contrato.dataFim,
      }),
    });
  },

  atualizar: async (id: string, contrato: Partial<any>) => {
    const mapped: any = {};
    if (contrato.clienteId !== undefined) mapped.cliente_id = contrato.clienteId;
    if (contrato.tipo !== undefined) mapped.tipo = contrato.tipo;
    if (contrato.horasContratadas !== undefined) mapped.horas_contratadas = contrato.horasContratadas;
    if (contrato.horasUsadas !== undefined) mapped.horas_usadas = contrato.horasUsadas;
    if (contrato.valorMensal !== undefined) mapped.valor_mensal = contrato.valorMensal;
    if (contrato.valorTotal !== undefined) mapped.valor_total = contrato.valorTotal;
    if (contrato.dataInicio !== undefined) mapped.data_inicio = contrato.dataInicio;
    if (contrato.dataFim !== undefined) mapped.data_fim = contrato.dataFim;
    if (contrato.status !== undefined) mapped.status = contrato.status;
    if (contrato.observacoes !== undefined) mapped.observacoes = contrato.observacoes;

    return fetchAPI(`/contratos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mapped),
    });
  },


  deletar: async (id: string) => {
  return fetchAPI(`/contratos/${id}`, {
    method: 'DELETE',
  });
},
};

// ====================================
// INTERVENÇÕES
// ====================================

export const intervencoesAPI = {
  listar: async () => {
    return fetchAPI('/intervencoes');
  },

  buscar: async (id: string) => {
    return fetchAPI(`/intervencoes/${id}`);
  },

  listarPorCliente: async (clienteId: string) => {
    return fetchAPI(`/intervencoes/cliente/${clienteId}`);
  },

  listarPorTecnico: async (tecnicoId: string) => {
    return fetchAPI(`/intervencoes/tecnico/${tecnicoId}`);
  },

criar: async (intervencao: {
  titulo: string;
  descricao?: string;
  clienteId: string;
  tecnicoId?: string | null;
  prioridade?: string;
  categoria?: string;
  data_agendada?: string | null;
  anexos?: any[];
  modo_resolucao?: string | null; 
  solicitante?: string | null;
  data_criacao?: string | null;
}) => {
    return fetchAPI('/intervencoes', {
      method: 'POST',
  body: JSON.stringify({
  titulo: intervencao.titulo,
  descricao: intervencao.descricao,
  categoria: intervencao.categoria,
  prioridade: intervencao.prioridade,
  cliente_id: intervencao.clienteId,
  tecnico_id: intervencao.tecnicoId,
  data_agendada: intervencao.data_agendada,
  modo_resolucao: intervencao.modo_resolucao,
  solicitante: intervencao.solicitante,
   data_criacao: intervencao.data_criacao,
  anexos: intervencao.anexos,
}),
    });
  },

  atualizar: async (id: string, intervencao: Partial<any>) => {
    return fetchAPI(`/intervencoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(intervencao),
    });
  },

  atualizarStatus: async (id: string, status: string) => {
    return fetchAPI(`/intervencoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: status }),
    });
  },

  adicionarComentario: async (id: string, comentario: {
    autor: string;
    texto: string;
  }) => {
    return fetchAPI(`/intervencoes/${id}/comentarios`, {
      method: 'POST',
      body: JSON.stringify(comentario),
    });
  },

deletar: async (id: string) => {
    return fetchAPI(`/intervencoes/${id}`, {
      method: 'DELETE',
    });
  },

  deletarPorCliente: async (clienteId: string) => {
  return fetchAPI(`/intervencoes/cliente/${clienteId}/todas`, {
    method: 'DELETE',
  });
},
};




// ====================================
// TÉCNICOS
// ====================================

export const tecnicosAPI = {
  listar: async () => {
    return fetchAPI('/tecnicos');
  },

  buscarPorUsuarioId: async (usuarioId: string) => {
    return fetchAPI(`/tecnicos/usuario/${usuarioId}`);
  },

  criar: async (tecnico: {
    nome: string;
    email: string;
    senha?: string;
    nivel?: string;
    especialidade?: string;
  }) => {
    return fetchAPI('/tecnicos', {
      method: 'POST',
      body: JSON.stringify(tecnico),
    });
  },

  atualizar: async (id: string, tecnico: Partial<any>) => {
    return fetchAPI(`/tecnicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tecnico),
    });
  },

  vincularUsuario: async (tecnicoId: string, userId: string) => {
    return fetchAPI(`/tecnicos/${tecnicoId}/vincular-usuario`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  deletar: async (id: string) => {
  return fetchAPI(`/tecnicos/${id}`, {
    method: 'DELETE',
  });
},
};

// ====================================
// REGISTROS DE HORAS
// ====================================

export const registrosHorasAPI = {
  listar: async () => {
    return fetchAPI('/registros-horas');
  },

  listarPorIntervencao: async (intervencaoId: string) => {
    return fetchAPI(`/registros-horas/intervencao/${intervencaoId}`);
  },

  listarPorTecnico: async (tecnicoId: string) => {
    return fetchAPI(`/registros-horas/tecnico/${tecnicoId}`);
  },

  
  criar: async (registro: {
    intervencao_id: string;
    tecnico_id: string;
    horas: number;
    descricao?: string;
    hora_inicio: string;  
    hora_fim: string;     
    data?: string;
  }) => {
    return fetchAPI('/registros-horas', {
      method: 'POST',
      body: JSON.stringify(registro), // ← envia direto, já está em snake_case
    });
  },
};

// ====================================
// ESTATÍSTICAS
// ====================================

export const statsAPI = {
  dashboard: async () => {
    return fetchAPI('/stats/dashboard');
  },
};

// ====================================
// NOTIFICAÇÕES
// ====================================

export const notificacoesAPI = {
  listar: async () => {
    return fetchAPI('/notificacoes');
  },
  marcarLida: async (id: string) => {
    return fetchAPI(`/notificacoes/${id}/marcar-lida`, { method: 'POST' });
  },
  marcarTodasLidas: async () => {
    return fetchAPI('/notificacoes/marcar-todas-lidas', { method: 'POST' });
  },
};

// ====================================
// INICIALIZAÇÃO (APENAS DESENVOLVIMENTO)
// ====================================

export const devAPI = {
  seedData: async () => {
    return fetchAPI('/seed-data', {
      method: 'POST',
    });
  },

  clearData: async () => {
    return fetchAPI('/clear-data', {
      method: 'DELETE',
    });
  },

  fixUserLinks: async () => {
    return fetchAPI('/fix-user-links', {
      method: 'POST',
    });
  },

  migrateStatus: async () => {
    return fetchAPI('/migrate-status', {
      method: 'POST',
    });
  },
};

export const financeiroAPI = {
  listar: async () => {
    return fetchAPI('/financeiro');
  },
  criar: async (movimento: {
    tipo: string;
    descricao?: string;
    valor: number;
    numero?: string;
    categoria?: string;
    forma_pagamento?: string;
    data?: string;
    conta_bancaria_id?: string;
  }) => {
    return fetchAPI('/financeiro', {
      method: 'POST',
      body: JSON.stringify(movimento),
    });
  },
  eliminar: async (id: string) => {
    return fetchAPI(`/financeiro/${id}`, {
      method: 'DELETE',
    });
  },
  atualizar: async (id: string, movimento: {
    descricao?: string;
    valor?: number;
    categoria?: string;
    forma_pagamento?: string;
    data?: string;
    conta_bancaria_id?: string;
  }) => {
    return fetchAPI(`/financeiro/${id}`, {
      method: 'PUT',
      body: JSON.stringify(movimento),
    });
  },
  contas: {
    criar: async (conta: { banco: string; numero_conta?: string; titular?: string }) => {
      return fetchAPI('/financeiro/contas', {
        method: 'POST',
        body: JSON.stringify(conta),
      });
    },
    atualizar: async (id: string, conta: { banco: string; numero_conta?: string; titular?: string }) => {
      return fetchAPI(`/financeiro/contas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(conta),
      });
    },
    eliminar: async (id: string) => {
      return fetchAPI(`/financeiro/contas/${id}`, {
        method: 'DELETE',
      });
    },
  },
  categorias: {
    listar: async () => {
      return fetchAPI('/financeiro/categorias');
    },
    criar: async (categoria: { nome: string }) => {
      return fetchAPI('/financeiro/categorias', {
        method: 'POST',
        body: JSON.stringify(categoria),
      });
    },
    atualizar: async (id: string, categoria: { nome: string }) => {
      return fetchAPI(`/financeiro/categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(categoria),
      });
    },
    eliminar: async (id: string) => {
      return fetchAPI(`/financeiro/categorias/${id}`, {
        method: 'DELETE',
      });
    },
  },
};

// ====================================
// COBRANÇAS
// ====================================

export const cobrancasAPI = {
  mapa: async (mes: number, ano: number) => {
    return fetchAPI(`/cobrancas/mapa?mes=${mes}&ano=${ano}`);
  },
  historico: async () => {
    return fetchAPI('/cobrancas/historico');
  },
  listar: async (mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    const qs = params.toString();
    return fetchAPI(`/cobrancas${qs ? `?${qs}` : ""}`);
  },
  salvar: async (cobranca: {
    cliente_id: string;
    mes: number;
    ano: number;
    pago: boolean;
    valor?: number;
    data_pagamento?: string | null;
    observacao?: string | null;
  }) => {
    return fetchAPI('/cobrancas', {
      method: 'POST',
      body: JSON.stringify(cobranca),
    });
  },
  eliminar: async (id: string) => {
    return fetchAPI(`/cobrancas/${id}`, {
      method: 'DELETE',
    });
  },
};

export const mensagensAPI = {
  contactos: async () => {
    return fetchAPI('/mensagens/contactos');
  },
  naoLidas: async () => {
    return fetchAPI('/mensagens/nao-lidas');
  },
  listar: async (caixa: 'entrada' | 'saida' | 'todas' = 'entrada') => {
    return fetchAPI(`/mensagens?caixa=${caixa}`);
  },
  conversa: async (outroUsuarioId: string) => {
    return fetchAPI(`/mensagens/conversa/${outroUsuarioId}`);
  },
  enviar: async (mensagem: {
    destinatario_id: string;
    assunto?: string;
    conteudo: string;
  }) => {
    return fetchAPI('/mensagens', {
      method: 'POST',
      body: JSON.stringify(mensagem),
    });
  },
  marcarComoLida: async (id: string) => {
    return fetchAPI(`/mensagens/${id}/ler`, {
      method: 'PUT',
    });
  },
};
