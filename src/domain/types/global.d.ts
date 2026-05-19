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
    gtag?: {
      (command: "js", date: Date): void;
      (
        command: "event" | "config" | "set",
        targetId: string,
        params?: GtagParams,
      ): void;
    };
    dataLayer?: DataLayerValue[];
  }
}

export {};
