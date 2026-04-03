import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  chartName?: string;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Chart rendering error${this.props.chartName ? ` in "${this.props.chartName}"` : ''}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <p className="text-sm">
            {this.props.chartName
              ? `Unable to render ${this.props.chartName} chart`
              : 'Unable to render chart'}
          </p>
          <button
            className="text-xs underline hover:text-foreground"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
