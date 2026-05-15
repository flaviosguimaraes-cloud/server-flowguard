import { createFileRoute } from '@tanstack/react-router'
import Whitelist from '../../pages/mitigation/Whitelist'

export const Route = createFileRoute('/mitigation/whitelist')({
  component: Whitelist,
})