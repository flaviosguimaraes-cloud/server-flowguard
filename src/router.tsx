 import { QueryClient } from '@tanstack/react-query'
 import { createRouter as createTanStackRouter } from '@tanstack/react-router'
 import { routeTree } from './routeTree.gen'
 
 export const getRouter = () => {
   const queryClient = new QueryClient()
 
   const router = createTanStackRouter({
   return router;
 }
     routeTree,
     context: { queryClient },
   })
 }
 
 declare module '@tanstack/react-router' {
   interface Register {
     router: ReturnType<typeof createRouter>
   }
 }