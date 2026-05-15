import { createFileRoute } from '@tanstack/react-router'
import Blacklist from '../../pages/mitigation/Blacklist'

export const Route = createFileRoute('/mitigation/blacklist')({
  component: Blacklist,
})
