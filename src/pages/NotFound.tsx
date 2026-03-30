import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home, Search } from 'lucide-react'

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-3xl font-semibold">Page Not Found</h2>
        <p className="mt-2 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="mt-8 flex justify-center space-x-4">
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/help">
              <Search className="mr-2 h-4 w-4" />
              Get Help
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
