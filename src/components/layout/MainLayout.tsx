import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FloatingAIButton } from '@/components/ai/FloatingAIButton'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { useUIStore } from '@/store/uiStore'
import { useToast } from '@/hooks/useToast'
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const { sidebarOpen } = useUIStore()
  const { toast } = useToast()
  const location = useLocation()

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
      {/* Skip to main content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarOpen ? 'lg:ml-64' : 'ml-0'
        )}
      >
        <Header />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-thin"
          style={{ background: 'hsl(var(--background))' }}
        >
          {/* Mesh gradient background */}
          <div
            className="sticky top-0 left-0 right-0 h-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.04) 0%, transparent 60%)',
            }}
          />

          <div className="p-5 lg:p-6">
            <Breadcrumbs />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Global UI Elements */}
      <ToastContainer />
      <ConfirmDialog />
      <FloatingAIButton />
      <OnboardingTour />
    </div>
  )
}
