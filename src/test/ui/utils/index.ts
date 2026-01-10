/**
 * UI Testing Utilities
 * 
 * Central export point for all testing utilities used in UI tests.
 * Import from this file to get consistent testing setup across all tests.
 * 
 * @example
 * import { renderWithProviders, screen, userEvent } from '@/test/ui/utils';
 */

// Import domain setup first to ensure mocks are registered
import "./setup-domain";

export * from "./test-utils";
export * from "./mock-factories";
