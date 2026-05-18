import { createFileRoute } from '@tanstack/react-router'
import BGPSessions from '../../pages/operation/BGPSessions'

export const Route = createFileRoute('/operation/bgp')({
  component: BGPSessions,
})
