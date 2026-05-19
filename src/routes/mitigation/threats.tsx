import { createFileRoute } from '@tanstack/react-router'
import Threats from '../../pages/mitigation/Threats'

export const Route = createFileRoute('/mitigation/threats')({
  component: Threats,
})
