 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { AuthProvider, useAuth } from "../contexts/AuthContext";
 import { Toaster } from "sonner";
 import { Sidebar } from "../components/Sidebar";
 import { Header } from "../components/Header";
 import {
   Outlet,
   createRootRouteWithContext,
   HeadContent,
   Scripts,
   useLocation,
   Navigate,
 } from "@tanstack/react-router";
 
 import appCss from "../styles.css?url";
 
 export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
   head: () => ({
     meta: [
       { charSet: "utf-8" },
       { name: "viewport", content: "width=device-width, initial-scale=1" },
       { title: "FlowGuard - Network Intelligence" },
     ],
     links: [
       { rel: "stylesheet", href: appCss },
     ],
   }),
   component: RootComponent,
 });
 
 function RootComponent() {
   const { queryClient } = Route.useRouteContext();
 
   return (
     <QueryClientProvider client={queryClient}>
       <AuthProvider>
         <AuthWrapper />
       </AuthProvider>
     </QueryClientProvider>
   );
 }
 
 function AuthWrapper() {
   const { user, loading } = useAuth();
   const location = useLocation();
 
   if (loading) return <div>Loading...</div>;
 
   const isLoginPage = location.pathname === '/login';
 
   if (!user && !isLoginPage) {
     return <Navigate to="/login" />;
   }
 
   if (isLoginPage) {
     return <Outlet />;
   }
 
   return (
     <div className="flex min-h-screen bg-[#0f1117] text-gray-100">
       <Sidebar />
       <div className="flex-1 flex flex-col min-w-0">
         <Header />
         <main className="p-6 overflow-auto">
           <Outlet />
         </main>
       </div>
       <Toaster position="top-right" theme="dark" />
       <Scripts />
     </div>
   );
 }