import { createFileRoute } from '@tanstack/react-router'
import Thresholds from '../../pages/operation/Thresholds'

export const Route = createFileRoute('/operation/thresholds')({
  component: Thresholds,
})