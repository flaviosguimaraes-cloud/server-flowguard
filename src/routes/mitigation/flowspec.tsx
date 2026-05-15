import { createFileRoute } from '@tanstack/react-router'
import Flowspec from '../../pages/mitigation/Flowspec'

export const Route = createFileRoute('/mitigation/flowspec')({
  component: Flowspec,
})
