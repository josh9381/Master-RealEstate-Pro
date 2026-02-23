import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { ToastContainer } from './components/ui/ToastContainer'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DevErrorPanel } from './components/DevErrorPanel'
import { initDevErrorMonitor } from './lib/devErrorMonitor'
import './index.css'

// Initialize dev error monitoring (only active in dev mode)
initDevErrorMonitor()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <App />
          <ToastContainer />
          <DevErrorPanel />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
