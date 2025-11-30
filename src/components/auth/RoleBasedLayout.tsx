import { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import type { UserPermissions } from '@/types'

interface RoleBasedLayoutProps {
  children: ReactNode
  allowedRoles?: ('ADMIN' | 'MANAGER' | 'USER')[]
  requirePermission?: keyof UserPermissions
  fallback?: ReactNode
}

/**
 * Component that conditionally renders children based on user role or permissions
 * Used to show/hide features based on user access level
 */
export function RoleBasedLayout({ 
  children, 
  allowedRoles, 
  requirePermission,
  fallback = null 
}: RoleBasedLayoutProps) {
  const { user, hasPermission } = useAuthStore()
  
  if (!user) {
    return <>{fallback}</>
  }
  
  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role.toUpperCase() as 'ADMIN' | 'MANAGER' | 'USER'
    if (!allowedRoles.includes(userRole)) {
      return <>{fallback}</>
    }
  }
  
  // Check permission-based access
  if (requirePermission) {
    if (!hasPermission(requirePermission)) {
      return <>{fallback}</>
    }
  }
  
  return <>{children}</>
}

interface RoleBasedSectionProps {
  children: ReactNode
  show: 'admin' | 'manager' | 'team' | 'solo'
}

/**
 * Quick helper component for common role-based sections
 */
export function RoleBasedSection({ children, show }: RoleBasedSectionProps) {
  const { isAdmin, isManager, isTeamMode } = useAuthStore()
  
  let shouldShow = false
  
  switch (show) {
    case 'admin':
      shouldShow = isAdmin()
      break
    case 'manager':
      shouldShow = isManager() || isAdmin()
      break
    case 'team':
      shouldShow = isTeamMode()
      break
    case 'solo':
      shouldShow = !isTeamMode()
      break
  }
  
  if (!shouldShow) return null
  
  return <>{children}</>
}
