import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FloatingAIButton } from '@/components/ai/FloatingAIButton'
import { useUIStore } from '@/store/uiStore'
import { useToast } from '@/hooks/useToast'
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const { sidebarOpen } = useUIStore()
  const { toast } = useToast()

  // Subscribe to real-time WebSocket events (lead/campaign/workflow updates)
  useRealtimeUpdates()

  // Update document title based on current route + unread notifications
  usePageTitle()

  // Listen for idle-warning events from the session manager
  useEffect(() => {
    const handleIdleWarning = () => {
      toast.warning('You will be logged out soon due to inactivity. Move your mouse or press a key to stay signed in.')
    }
    window.addEventListener('session:idle-warning', handleIdleWarning)
    return () => window.removeEventListener('session:idle-warning', handleIdleWarning)
  }, [toast])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-0'
        )}
      >
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
      
      <ToastContainer />
      <ConfirmDialog />
      <FloatingAIButton />
    </div>
  )
}
