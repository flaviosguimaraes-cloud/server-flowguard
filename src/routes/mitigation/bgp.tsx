import { createFileRoute } from '@tanstack/react-router'
import BGP from '../../pages/operation/BGP'

export const Route = createFileRoute('/mitigation/bgp')({
  component: BGP,
})
