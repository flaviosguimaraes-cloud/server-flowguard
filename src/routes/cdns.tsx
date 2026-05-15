import { createFileRoute } from '@tanstack/react-router'
import CDNs from '../pages/CDNs'

export const Route = createFileRoute('/cdns')({
  component: CDNs,
})
