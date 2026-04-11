import { Component, ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  name?: string
  onClose?: () => void
}

interface State {
  hasError: boolean
}

/**
 * Lightweight error boundary for modals, drawers, and inline panels.
 * Catches render errors without crashing the parent page.
 */
export class ModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    logger.error(`Error in ${this.props.name || 'modal'}:`, error)
  }

  handleDismiss = () => {
    this.setState({ hasError: false })
    this.props.onClose?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full mb-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {this.props.name
              ? `The ${this.props.name} encountered an error.`
              : 'This component encountered an error.'}
          </p>
          <button
            onClick={this.handleDismiss}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
