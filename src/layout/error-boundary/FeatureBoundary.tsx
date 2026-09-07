import type { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { FeatureErrorFallback } from "./FeatureErrorFallback";

interface FeatureBoundaryProps {
  children: ReactNode;
  featureName: string;
  errorContext?: string;
  resetKeys?: readonly unknown[];
}

export const FeatureBoundary = ({
  children,
  featureName,
  errorContext = featureName,
  resetKeys,
}: FeatureBoundaryProps) => (
  <ErrorBoundary
    errorContext={errorContext}
    resetKeys={resetKeys}
    fallback={(_, resetError) => (
      <FeatureErrorFallback
        featureName={featureName}
        resetError={resetError}
      />
    )}
  >
    {children}
  </ErrorBoundary>
);
