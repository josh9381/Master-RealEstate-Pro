import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Bell, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface ComingSoonProps {
  /** Feature name displayed in the heading */
  title: string
  /** Short description of the upcoming feature */
  description: string
  /** Icon component to display in the illustration area */
  icon: React.ElementType
  /** Optional list of teaser sub-features shown as blurred preview items */
  previewItems?: string[]
  /** Optional expected timeline text (e.g. "Q2 2026") */
  timeline?: string
  /** Optional additional class names */
  className?: string
}

/**
 * Standardized "Coming Soon" page component.
 *
 * DS-15 decision: illustration + blurred preview hybrid.
 * Shows a polished illustration with description, a greyed/blurred mockup
 * of the upcoming feature, and an optional "Notify Me" button.
 */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  previewItems,
  timeline,
  className = '',
}: ComingSoonProps) {
  const { toast } = useToast()
  const [notifyRequested, setNotifyRequested] = useState(false)

  const handleNotifyMe = () => {
    setNotifyRequested(true)
    toast.success(`We'll notify you when ${title} is available!`)
  }

  return (
    <div className={`flex items-center justify-center min-h-[60vh] ${className}`}>
      <div className="w-full max-w-2xl space-y-6">
        {/* Illustration section */}
        <div className="text-center">
          {/* Decorative illustration */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent dark:from-primary/30 dark:via-primary/10 blur-2xl scale-150" />
            <div className="relative p-6 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-3xl border border-primary/10 dark:border-primary/30">
              <Icon className="h-16 w-16 text-primary" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary/70 dark:text-primary/80 animate-pulse" />
          </div>

          <Badge variant="warning" className="mb-4 text-sm px-3 py-1">
            Coming Soon
          </Badge>
          {timeline && (
            <Badge variant="secondary" className="mb-4 ml-2 text-sm px-3 py-1">
              {timeline}
            </Badge>
          )}

          <h2 className="text-lg font-semibold mb-2">{title}</h2>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Blurred preview mockup */}
        {previewItems && previewItems.length > 0 && (
          <Card className="relative overflow-hidden">
            {/* Blur overlay */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[3px] z-10 flex items-center justify-center">
              <div className="text-center">
                <div className="p-3 bg-muted rounded-full inline-block mb-2">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Preview — Feature in development
                </p>
              </div>
            </div>

            {/* Greyed-out preview content */}
            <CardContent className="p-6">
              <div className="space-y-3">
                {previewItems.map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">{item}</div>
                      <div className="h-2 w-2/3 bg-muted rounded mt-1.5" />
                    </div>
                    <div className="h-6 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notify Me button */}
        <div className="text-center">
          <Button
            variant={notifyRequested ? 'outline' : 'default'}
            onClick={handleNotifyMe}
            disabled={notifyRequested}
          >
            <Bell className="h-4 w-4 mr-2" />
            {notifyRequested ? 'Notification Set' : 'Notify Me When Available'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ComingSoon
