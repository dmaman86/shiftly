import React from "react";
import { ErrorBoundary, FeatureErrorFallback } from "@/layout";

interface WithErrorBoundaryOptions {
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error) => void;
  componentName?: string;
}

export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {},
) => {
  const { fallback, onError, componentName } = options;

  const wrappedComponentName =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    "Component";

  const defaultFallback = (error: Error, reset: () => void) => (
    <FeatureErrorFallback
      error={error}
      resetError={reset}
      featureName={wrappedComponentName}
    />
  );

  const ComponentWithErrorBoundary = (props: P) => {
    const handleError = (error: Error): void => {
      if (import.meta.env.DEV) {
        console.group(`🛑 Error in ${wrappedComponentName}`);
        console.error("Error:", error);
        console.error("Props:", props);
        console.groupEnd();
      }

      if (typeof window.gtag === "function") {
        window.gtag("event", "component_error", {
          component: wrappedComponentName,
          error_message: error.message,
          error_type: error.name,
        });
      }

      onError?.(error);
    };

    const finalFallback = fallback || defaultFallback;

    return (
      <ErrorBoundary fallback={finalFallback} onError={handleError}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${wrappedComponentName})`;

  return ComponentWithErrorBoundary;
};
