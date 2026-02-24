import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TicketList } from './components/TicketList';
import { Controls } from './components/Controls';
import { SLAAlertPopup } from './components/SLAAlertPopup';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'list':
        return <TicketList />;
      case 'controls':
        return <Controls />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden fixed top-4 right-4 z-[60] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg"
        >
          {isMobileMenuOpen ? <X size={24} className="text-slate-900 dark:text-white" /> : <Menu size={24} className="text-slate-900 dark:text-white" />}
        </button>

        {/* Sidebar - Desktop */}
        <div className="hidden md:block">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Sidebar - Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="w-64 h-full shadow-2xl animate-in slide-in-from-left duration-300">
              <Sidebar 
                activeTab={activeTab} 
                setActiveTab={(tab) => {
                  setActiveTab(tab);
                  setIsMobileMenuOpen(false);
                }} 
              />
            </div>
            <div 
              className="flex-1 bg-black/40 backdrop-blur-sm" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>

        <SLAAlertPopup />
      </div>
    </ThemeProvider>
  );
}
