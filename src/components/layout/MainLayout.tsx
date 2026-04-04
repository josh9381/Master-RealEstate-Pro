import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FloatingAIButton } from '@/components/ai/FloatingAIButton'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { SetupWizard } from '@/components/onboarding/SetupWizard'
import { useToast } from '@/hooks/useToast'
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates'
import { usePageTitle } from '@/hooks/usePageTitle'

export function MainLayout() {
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
      {/* Skip to main content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Sidebar />

      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-300 min-w-0"
      >
        <Header />

        <main id="main-content" className="flex-1 overflow-y-auto bg-muted/10 p-6">
          <div className="mx-auto max-w-screen-2xl">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
      
      <ToastContainer />
      <ConfirmDialog />
      <FloatingAIButton />
      <SetupWizard />
      <OnboardingTour />
    </div>
  )
}
