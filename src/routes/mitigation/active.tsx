import { createFileRoute } from '@tanstack/react-router'
import ActiveMitigation from '../../pages/mitigation/Active'

export const Route = createFileRoute('/mitigation/active')({
  component: ActiveMitigation,
})