import { Card, CardContent, CardHeader } from '@/components/ui/Card';

/**
 * Reusable loading skeleton for page sections
 */
export const LoadingSkeleton = ({ rows = 3, showChart = false }: { rows?: number; showChart?: boolean }) => (
  <div className="space-y-6 animate-pulse">
    {/* Stats row */}
    <div className="grid gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 bg-muted rounded w-24" />
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-muted rounded w-16 mb-2" />
            <div className="h-3 bg-muted rounded w-20" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Chart placeholder */}
    {showChart && (
      <Card>
        <CardHeader>
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded" />
        </CardContent>
      </Card>
    )}

    {/* List rows */}
    <Card>
      <CardHeader>
        <div className="h-5 bg-muted rounded w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-muted rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-8 bg-muted rounded w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

/**
 * Simple inline loading spinner
 */
export const LoadingSpinner = ({ text = 'Loading...' }: { text?: string }) => (
  <Card className="p-12">
    <div className="flex flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  </Card>
);
