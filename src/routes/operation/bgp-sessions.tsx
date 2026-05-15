import { createFileRoute } from '@tanstack/react-router'
import BGPSessions from '../../pages/operation/BGPSessions'

export const Route = createFileRoute('/operation/bgp-sessions')({
  component: BGPSessions,
})
