import { createFileRoute } from '@tanstack/react-router'
import Events from '../../pages/mitigation/Events'

export const Route = createFileRoute('/mitigation/events')({
  component: Events,
})
