import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/mitigation/active')({
  component: () => <Navigate to="/mitigation/events" replace />,
})