import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">CRM Platform</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Marketing Automation & Intelligence
          </p>
        </div>
        
        <Outlet />
      </div>
    </div>
  )
}
