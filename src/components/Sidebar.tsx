import React from 'react';
import { LayoutDashboard, ListTodo, Settings, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'list', label: 'Chamados', icon: ListTodo },
    { id: 'controls', label: 'Controles', icon: Settings },
  ];

  return (
    <div className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30 shrink-0">
          <ShieldCheck className="text-white" size={24} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase">Tickets</span>
          <span className="text-lg font-black tracking-tighter text-blue-600 uppercase">Manager</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all cursor-pointer ${
              activeTab === item.id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold">
            AD
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">Administrador</span>
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Admin Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
};
