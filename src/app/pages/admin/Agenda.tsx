import { useState, useEffect, useMemo } from 'react'
import { intervencoesAPI } from '../../services/api'
import { Filter, Clock, User, ChevronLeft, ChevronRight, X, Building2, Bell } from 'lucide-react'

interface Intervencao {
  id: string
  titulo: string
  descricao?: string
  clienteNome: string
  tecnicoNome: string
  empresaNome?: string
  dataAgendada?: string
  dataCriacao?: string
  horaInicio?: string
  horaFim?: string
  status: string
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const TECNICO_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-yellow-500',
]

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  em_curso: 'bg-blue-100 text-blue-700 border-blue-200',
  concluida: 'bg-green-100 text-green-700 border-green-200',
  cancelada: 'bg-red-100 text-red-700 border-red-200',
  Aberto: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Em Andamento': 'bg-blue-100 text-blue-700 border-blue-200',
  Concluído: 'bg-green-100 text-green-700 border-green-200',
}

export default function AdminAgenda() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<{ date: string; intervencoes: Intervencao[] } | null>(null)
  const [filterTecnico, setFilterTecnico] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCliente, setFilterCliente] = useState('')
  const [filterIntervencao, setFilterIntervencao] = useState('')
  const [filterDataCriacao, setFilterDataCriacao] = useState('')
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([])

  useEffect(() => {
    intervencoesAPI.listar().then((res: any) => setIntervencoes(res.data || []))
  }, [])

  const tecnicoColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    const nomes = [...new Set(intervencoes.map(i => i.tecnicoNome))]
    nomes.forEach((nome, idx) => {
      map[nome] = TECNICO_COLORS[idx % TECNICO_COLORS.length]
    })
    return map
  }, [intervencoes])

  const filtered = useMemo(() => {
    return intervencoes.filter(i => {
      if (filterTecnico && i.tecnicoNome !== filterTecnico) return false
      if (filterStatus && i.status !== filterStatus) return false
      if (filterCliente && !(i.empresaNome?.toLowerCase().includes(filterCliente.toLowerCase()) || i.clienteNome?.toLowerCase().includes(filterCliente.toLowerCase()))) return false
      if (filterIntervencao && !i.titulo?.toLowerCase().includes(filterIntervencao.toLowerCase())) return false
      if (filterDataCriacao && !i.dataCriacao?.startsWith(filterDataCriacao)) return false
      return true
    })
  }, [intervencoes, filterTecnico, filterStatus, filterCliente, filterIntervencao, filterDataCriacao])

  const byDay = useMemo(() => {
    const map: Record<string, Intervencao[]> = {}
    filtered.forEach(i => {
      if (!i.dataAgendada) return
      const d = i.dataAgendada.split('T')[0]
      if (!map[d]) map[d] = []
      map[d].push(i)
    })
    return map
  }, [filtered])

  const tecnicos = useMemo(() => [...new Set(intervencoes.map(i => i.tecnicoNome))].filter(Boolean), [intervencoes])

  const isFiltering = !!(filterTecnico || filterStatus || filterCliente || filterIntervencao || filterDataCriacao)

  const todayStr = today.toISOString().split('T')[0]
  const todayIntervencoes = byDay[todayStr] ?? []

  function MiniMonth({ month }: { month: number }) {
    const firstDay = new Date(currentYear, month, 1).getDay()
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate()

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">{MONTHS[month]}</h3>
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center text-[10px] text-gray-400 font-medium py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayIntervencoes = byDay[dateStr] ?? []
            const hasEvents = dayIntervencoes.length > 0
            const isToday = dateStr === todayStr

            return (
              <button key={day}
                onClick={() => hasEvents ? setSelectedDay({ date: dateStr, intervencoes: dayIntervencoes }) : null}
                className={`relative flex flex-col items-center justify-start rounded-md text-[11px] font-medium transition-all pt-0.5 pb-1 min-h-[28px]
                  ${isToday ? 'bg-blue-600 text-white rounded-full' :
                    hasEvents ? 'hover:bg-gray-50 cursor-pointer' :
                      'text-gray-400 cursor-default'}`}>
                <span className={isToday ? 'text-white' : hasEvents ? 'text-gray-700' : 'text-gray-400'}>
                  {day}
                </span>
                {hasEvents && (
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {dayIntervencoes.slice(0, 3).map((inv, idx) => (
                      <span key={idx} className={`w-1.5 h-1.5 rounded-full ${tecnicoColorMap[inv.tecnicoNome] ?? 'bg-gray-400'}`} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda {currentYear}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Visão anual das intervenções por técnico</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentYear(y => y - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700 px-2">{currentYear}</span>
          <button onClick={() => setCurrentYear(y => y + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Banner de hoje */}
      {todayIntervencoes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Bell size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {todayIntervencoes.length} intervenção(ões) agendada(s) para hoje!
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {todayIntervencoes.map(i => i.titulo).join(' · ')}
            </p>
          </div>
          <button onClick={() => setSelectedDay({ date: todayStr, intervencoes: todayIntervencoes })}
            className="ml-auto text-xs text-blue-600 font-medium hover:underline whitespace-nowrap">
            Ver detalhes ?
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <span className="text-sm text-gray-500 font-medium">Filtros:</span>
          </div>
          <select value={filterTecnico} onChange={e => setFilterTecnico(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500">
            <option value="">Todos os técnicos</option>
            {tecnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500">
            <option value="">Todos os estados</option>
            <option value="Aberto">Aberto</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
          </select>
          <input value={filterCliente} onChange={e => setFilterCliente(e.target.value)}
            placeholder="Filtrar por empresa ou cliente..."
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500" />
          <input value={filterIntervencao} onChange={e => setFilterIntervencao(e.target.value)}
            placeholder="Filtrar por intervenção..."
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500" />
          <input
            type="date"
            value={filterDataCriacao}
            onChange={e => setFilterDataCriacao(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500"
          />
          <div className="flex flex-wrap gap-3 ml-auto">
            {tecnicos.map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${tecnicoColorMap[t]}`} />
                <span className="text-xs text-gray-600">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 12 meses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, month) => {
          const hasFilteredEvents = Object.keys(byDay).some(dateStr => {
            const [year, m] = dateStr.split('-')
            return Number(year) === currentYear && Number(m) === month + 1
          })
          if (isFiltering && !hasFilteredEvents) return null
          return <MiniMonth key={month} month={month} />
        })}
      </div>

      {/* Modal dia selecionado */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedDay.intervencoes.map(i => (
                <div key={i.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tecnicoColorMap[i.tecnicoNome] ?? 'bg-gray-400'}`} />
                      <p className="text-gray-900 text-sm font-medium">{i.titulo}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {i.status}
                    </span>
                  </div>
                  {i.empresaNome && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-4">
                      <Building2 size={11} />
                      <span><strong>Empresa:</strong> {i.empresaNome}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-4">
                    <User size={11} />
                    <span><strong>Cliente:</strong> {i.clienteNome}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-4">
                    <User size={11} className="text-blue-500" />
                    <span><strong>Técnico:</strong> {i.tecnicoNome}</span>
                  </div>
                  {i.dataAgendada && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-4">
                      <Clock size={11} />
                      <span><strong>Hora:</strong> {new Date(i.dataAgendada).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}

                  {(i.horaInicio || i.horaFim) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-4">
                      <Clock size={11} />
                      <span><strong>Hora técnico:</strong> {i.horaInicio ?? '--:--'} ? {i.horaFim ?? '--:--'}</span>
                    </div>
                  )}

                  {i.descricao && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-4">
                      <span><strong>Descrição:</strong> {i.descricao}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
