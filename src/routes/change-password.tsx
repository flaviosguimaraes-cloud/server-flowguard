 import { createFileRoute } from '@tanstack/react-router'
 import ChangePassword from '../pages/ChangePassword'
 
 type ChangePasswordSearch = {
   mandatory?: boolean
   username?: string
 }
 
 export const Route = createFileRoute('/change-password')({
   validateSearch: (search: Record<string, unknown>): ChangePasswordSearch => {
     return {
       mandatory: search.mandatory === true || search.mandatory === 'true',
       username: search.username as string | undefined,
     }
   },
   component: ChangePassword,
 })