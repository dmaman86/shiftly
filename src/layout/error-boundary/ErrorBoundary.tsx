import React from "react";
import { analyticsService } from "@/services";
import { DefaultErrorFallback } from "./DefaultErrorFallback";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fatal?: boolean;
  errorContext?: string;
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

const resetKeysChanged = (
  previousKeys: readonly unknown[] | undefined,
  currentKeys: readonly unknown[] | undefined,
): boolean => {
  if (previousKeys === currentKeys) return false;
  if (!previousKeys || !currentKeys) return true;
  if (previousKeys.length !== currentKeys.length) return true;

  return previousKeys.some(
    (previousKey, index) => !Object.is(previousKey, currentKeys[index]),
  );
};

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
    analyticsService.track({
      name: "exception",
      params: {
        description: error.message,
        fatal: this.props.fatal ?? false,
        error_type: error.name,
        ...(this.props.errorContext && {
          error_context: this.props.errorContext,
        }),
      },
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (
      this.state.error &&
      resetKeysChanged(previousProps.resetKeys, this.props.resetKeys)
    ) {
      this.resetError();
    }
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
      return <DefaultErrorFallback resetError={this.resetError} />;
    }

    return children;
  }
}
