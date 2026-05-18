import { createFileRoute, Navigate } from '@tanstack/react-router';
import Users from '../../pages/admin/Users';
import { PrivateRoute } from '../../components/PrivateRoute';

export const Route = createFileRoute('/admin/users')({
  component: () => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <PrivateRoute>
        <Users />
      </PrivateRoute>
    );
  },
});