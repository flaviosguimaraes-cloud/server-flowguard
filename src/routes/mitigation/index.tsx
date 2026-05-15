import { createFileRoute } from '@tanstack/react-router'
import Mitigation from '../../pages/mitigation/Index'

export const Route = createFileRoute('/mitigation/')({
  component: Mitigation,
})
