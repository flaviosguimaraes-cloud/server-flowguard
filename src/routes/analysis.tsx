import { createFileRoute } from '@tanstack/react-router'
import Analysis from '../pages/Analysis'

export const Route = createFileRoute('/analysis')({
  component: Analysis,
})
