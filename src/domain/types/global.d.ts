/**
 * Type declarations for Google Analytics gtag
 */

type GtagPrimitive = string | number | boolean | null | undefined;
type ConsentStatus = "granted" | "denied";

interface GtagParams {
  [key: string]: GtagPrimitive | GtagParams | GtagPrimitive[];
}

interface ConsentParams {
  analytics_storage?: ConsentStatus;
  ads_storage?: ConsentStatus;
  ad_user_data?: ConsentStatus;
  ad_personalization?: ConsentStatus;
}

type DataLayerValue =
  | GtagPrimitive
  | Date
  | { [key: string]: DataLayerValue }
  | DataLayerValue[];

declare global {
  interface Window {
    gtag?: {
      (
        command: "consent",
        consentArg: "default" | "update",
        params: ConsentParams,
      ): void;
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
