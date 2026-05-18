import { createFileRoute } from '@tanstack/react-router';
import Users from '../../pages/admin/Users';
import { PrivateRoute } from '../../components/PrivateRoute';

export const Route = createFileRoute('/admin/users')({
  component: () => (
    <PrivateRoute>
      <Users />
    </PrivateRoute>
  ),
});