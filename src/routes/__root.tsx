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
       { property: "og:title", content: "FlowGuard - Network Intelligence" },
       { name: "twitter:title", content: "FlowGuard - Network Intelligence" },
       { name: "description", content: "FlowGuard Network Intelligence is a web application for network traffic analysis and DDoS mitigation for ISPs." },
       { property: "og:description", content: "FlowGuard Network Intelligence is a web application for network traffic analysis and DDoS mitigation for ISPs." },
       { name: "twitter:description", content: "FlowGuard Network Intelligence is a web application for network traffic analysis and DDoS mitigation for ISPs." },
       { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2d1fa8cc-60ae-4ce0-a268-ccc403819d93/id-preview-6cc36916--bf6c73c4-2e91-4566-a7ad-d825a9a1da0a.lovable.app-1778867152446.png" },
       { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2d1fa8cc-60ae-4ce0-a268-ccc403819d93/id-preview-6cc36916--bf6c73c4-2e91-4566-a7ad-d825a9a1da0a.lovable.app-1778867152446.png" },
       { name: "twitter:card", content: "summary_large_image" },
       { property: "og:type", content: "website" },
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
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthWrapper />
          </AuthProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AuthWrapper() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1117] text-gray-100">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  const isLoginPage = location.pathname === "/login";

  if (!user && !isLoginPage) {
    return <Navigate to="/login" />;
  }

  if (isLoginPage) {
    return (
      <>
        <Outlet />
        <Toaster position="top-right" theme="dark" />
      </>
    );
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
    </div>
  );
}