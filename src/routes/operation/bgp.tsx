import { createFileRoute } from '@tanstack/react-router'
import BGP from '../../pages/operation/BGP'

export const Route = createFileRoute('/operation/bgp')({
  component: BGP,
})
