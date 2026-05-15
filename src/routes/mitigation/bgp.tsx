import { createFileRoute } from '@tanstack/react-router'
import BGP from '../../pages/mitigation/BGP'

export const Route = createFileRoute('/mitigation/bgp')({
  component: BGP,
})
