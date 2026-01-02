import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.group("🛑 Error Boundary Caught Error");
      console.error("Error:", error);
      console.error("Component Stack:", errorInfo.componentStack);
      console.groupEnd();
    }

    // Send to Google Analytics
    if (typeof window.gtag === "function") {
      window.gtag("event", "exception", {
        description: error.message,
        fatal: true,
        error_type: error.name,
      });
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) {
        return fallback(error, this.resetError);
      }
      return null;
    }

    return children;
  }
}
