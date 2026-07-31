import { useAuth } from '../context/AuthContext';

export function useRolePath() {
  const { role } = useAuth();
  const prefix =
    role === 'SUPER_ADMIN'  ? '/admin' :
    role === 'SUB_CUSTOMER' ? '/sub-customer' :
    '/dashboard';

  return (path) => (path === '/' ? prefix : `${prefix}${path}`);
}
