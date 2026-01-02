/**
 * Type declarations for Google Analytics gtag
 */

type GtagPrimitive = string | number | boolean | null | undefined;

interface GtagParams {
  [key: string]: GtagPrimitive | GtagParams | GtagPrimitive[];
}

type DataLayerValue =
  | GtagPrimitive
  | Date
  | { [key: string]: DataLayerValue }
  | DataLayerValue[];

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "js" | "set",
      ...args: [string, GtagParams?] | [Date]
    ) => void;
    dataLayer?: DataLayerValue[];
  }
}

export {};
