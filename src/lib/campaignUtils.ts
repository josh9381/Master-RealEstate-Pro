/**
 * Shared campaign utility functions used across campaigns pages and components.
 */

/** Map campaign status to Badge variant */
export function getStatusVariant(status: string): 'success' | 'default' | 'warning' | 'secondary' | 'outline' | 'destructive' {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'success'
    case 'SENDING': return 'default'
    case 'SCHEDULED': return 'warning'
    case 'PAUSED': return 'secondary'
    case 'COMPLETED': return 'outline'
    case 'DRAFT': return 'secondary'
    case 'CANCELLED': return 'destructive'
    default: return 'secondary'
  }
}
