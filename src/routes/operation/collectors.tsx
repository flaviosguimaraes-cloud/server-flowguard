import { createFileRoute } from '@tanstack/react-router'
import Collectors from '../../pages/operation/Collectors'

export const Route = createFileRoute('/operation/collectors')({
  component: Collectors,
})
