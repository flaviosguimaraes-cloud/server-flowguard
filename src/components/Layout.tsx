import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from 'sonner';
import { SystemAlerts } from './SystemAlerts';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen w-full bg-bg-page overflow-hidden">
      {/* Sidebar Fixa */}
      <Sidebar />

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header Fixo */}
        <Header />

        {/* Conteúdo com Scroll Próprio */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <SystemAlerts />
          <main className="w-full h-full">
            {children}
          </main>
        </div>
      </div>
      
      <Toaster position="top-right" theme="dark" />
    </div>
  );
};
