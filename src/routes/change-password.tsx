 import { createFileRoute } from '@tanstack/react-router'
 import ChangePassword from '../pages/ChangePassword'
 
 export const Route = createFileRoute('/change-password')({
   component: ChangePassword,
 })