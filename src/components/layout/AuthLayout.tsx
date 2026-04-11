import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-semibold">RealEstate<span className="text-primary">Pro</span></h1>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            CRM & Marketing Automation for Real Estate
          </p>
        </div>
        
        <Outlet />
      </div>
    </div>
  )
}
