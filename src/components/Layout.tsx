 import { Sidebar } from './Sidebar';
 import { Header } from './Header';
 import { Toaster } from 'sonner';
 import { SystemAlerts } from './SystemAlerts';
 
 export const Layout = ({ children }: { children: React.ReactNode }) => {
   return (
      <div className="flex min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
       <div className="flex min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
         <Sidebar />
         <div className="flex-1 flex flex-col min-w-0">
           <Header />
           <SystemAlerts />
           <main className="p-6">
             {children}
           </main>
         </div>
         <Toaster position="top-right" theme="dark" />
       </div>
   );
 };