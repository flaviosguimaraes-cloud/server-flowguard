import { createFileRoute } from '@tanstack/react-router'
import Monitoring from '../pages/Monitoring'

export const Route = createFileRoute('/monitoring')({
  component: Monitoring,
})