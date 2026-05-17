import { createFileRoute } from '@tanstack/react-router'
import Policy from '../../pages/mitigation/Policy'

export const Route = createFileRoute('/mitigation/policy')({
  component: Policy,
})