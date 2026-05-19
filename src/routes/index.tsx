import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return <Navigate to={token ? "/dashboard" : "/login"} replace />;
  },
})