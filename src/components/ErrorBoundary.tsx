import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let message = "Something went wrong.";
      try {
        const errInfo = JSON.parse(error?.message || "");
        if (errInfo.error.includes("Missing or insufficient permissions")) {
          message = "You don't have permission to access this data. Please check your account settings.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h1>
          <p className="text-slate-600 mb-4">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
