import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface RequireRoleProps {
  children: React.ReactNode
  roles: Array<'ADMIN' | 'admin' | 'MANAGER' | 'manager'>
  fallback?: string
}

/**
 * Route guard that restricts access to users with specific roles.
 * Redirects to the dashboard (or a custom fallback) if the user lacks the required role.
 *
 * Usage:
 *   <RequireRole roles={['ADMIN', 'admin']}>
 *     <AdminPanel />
 *   </RequireRole>
 */
export function RequireRole({ children, roles, fallback = '/dashboard' }: RequireRoleProps) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  if (!roles.includes(user.role as any)) {
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}

/**
 * Convenience wrapper: requires ADMIN or admin role.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['ADMIN', 'admin', 'MANAGER', 'manager']}>
      {children}
    </RequireRole>
  )
}
