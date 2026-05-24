import { createFileRoute } from '@tanstack/react-router';
import IPGroups from '../../pages/admin/IPGroups';

export const Route = createFileRoute('/admin/ip-groups')({
  component: IPGroups,
});
