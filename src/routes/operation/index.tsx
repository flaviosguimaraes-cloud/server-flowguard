import { createFileRoute } from '@tanstack/react-router'
import Operation from '../../pages/operation/Index'

export const Route = createFileRoute('/operation/')({
  component: Operation,
})