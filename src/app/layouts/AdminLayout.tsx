import { Outlet, useNavigate, useLocation } from "react-router";
import PerfilDropdown from "../components/PerfilDropdown";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Wrench,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  Calendar
} from "lucide-react";
import { useState } from "react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const menuItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/agenda", label: "Agenda", icon: Calendar },
    { path: "/admin/clientes", label: "Clientes", icon: Users },
    { path: "/admin/contratos", label: "Contratos", icon: FileText },
    { path: "/admin/intervencoes", label: "Intervenções", icon: ClipboardList },
    { path: "/admin/tecnicos", label: "Técnicos", icon: Wrench },
    { path: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },

  ];

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-blue-900 text-white transition-transform duration-300`}>
        <div className="flex items-center justify-between p-6 border-b border-blue-800">
          <h1 className="text-2xl font-bold">CLACS Admin</h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                  ? "bg-blue-700 text-white"
                  : "text-blue-100 hover:bg-blue-800"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden">
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex-1 md:flex-none"></div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="relative">
                <button onClick={() => setMostrarPerfil(!mostrarPerfil)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-800">{localStorage.getItem('userName') || 'Utilizador'}</p>
                    <p className="text-xs text-gray-500">{localStorage.getItem('userEmail') || ''}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(localStorage.getItem('userName') || 'U').charAt(0).toUpperCase()}
                  </div>
                </button>
                {mostrarPerfil && <PerfilDropdown onClose={() => setMostrarPerfil(false)} />}
              </div>

              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}