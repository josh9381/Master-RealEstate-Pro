import { logger } from '@/lib/logger'
import { Component, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

/**
 * PageErrorBoundary - Catches errors in individual pages
 * Shows a friendly message without breaking the entire app
 * Detects chunk load failures and shows a clean "Reload page" card
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const msg = error.message.toLowerCase();
    const isChunkError =
      msg.includes('loading chunk') ||
      msg.includes('loading css chunk') ||
      msg.includes('dynamically imported module') ||
      msg.includes('failed to fetch') ||
      msg.includes('importing a module script failed');
    return {
      hasError: true,
      error,
      isChunkError,
    };
  }

  componentDidCatch(error: Error) {
    logger.error(`Error in ${this.props.pageName || 'page'}:`, error);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Chunk load error — clean card with reload button
      if (this.state.isChunkError) {
        return (
          <div className="flex items-center justify-center min-h-[60vh] p-8">
            <div className="max-w-sm w-full bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Update Available
              </h2>
              <p className="text-gray-600 mb-6">
                A newer version of this page is available. Please reload to continue.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Page Not Available
              </h2>
              
              <p className="text-gray-600 mb-6">
                {this.props.pageName 
                  ? `The ${this.props.pageName} page encountered an error.`
                  : 'This page encountered an error.'
                }
                {' '}This feature may still be in development.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Error Details (Development):
                  </p>
                  <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Link>
                
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
