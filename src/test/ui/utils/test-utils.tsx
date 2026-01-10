import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { SnackbarProvider } from "notistack";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { configureStore } from "@reduxjs/toolkit";
import type { RootState } from "@/redux/store";
import globalReducer from "@/redux/states/globalSlice";
import workDaysReducer from "@/redux/states/workDaysSlice";

// Create RTL cache for tests
const cache = createCache({ key: "css", prepend: true });

// Create default theme for tests
const theme = createTheme({
  direction: "rtl",
  palette: {
    mode: "light",
  },
});

/**
 * Creates a mock Redux store for testing
 * @param preloadedState - Initial state for the store
 * @returns Configured store instance
 */
export function createMockStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      workDays: workDaysReducer,
      global: globalReducer,
    },
    preloadedState: preloadedState as RootState,
  });
}

interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  preloadedState?: Partial<RootState>;
  store?: ReturnType<typeof createMockStore>;
  withRouter?: boolean;
  withTheme?: boolean;
  withSnackbar?: boolean;
}

/**
 * Custom render function that wraps components with necessary providers
 * 
 * @example
 * // Render with all providers
 * render(<MyComponent />, { preloadedState: { global: {...} } });
 * 
 * @example
 * // Render without router
 * render(<MyComponent />, { withRouter: false });
 * 
 * @example
 * // Render with custom store
 * const store = createMockStore({ global: {...} });
 * render(<MyComponent />, { store });
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = createMockStore(preloadedState),
    withRouter = true,
    withTheme = true,
    withSnackbar = true,
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    let component = (
      <Provider store={store}>
        {children}
      </Provider>
    );

    if (withTheme) {
      component = (
        <CacheProvider value={cache}>
          <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              {component}
            </LocalizationProvider>
          </ThemeProvider>
        </CacheProvider>
      );
    }

    if (withSnackbar) {
      component = (
        <SnackbarProvider maxSnack={3}>
          {component}
        </SnackbarProvider>
      );
    }

    if (withRouter) {
      component = (
        <BrowserRouter>
          {component}
        </BrowserRouter>
      );
    }

    return component;
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Render a component without any providers (for pure components)
 */
export function renderPure(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, options);
}

/**
 * Render with only Theme provider (for presentational components)
 * Includes LocalizationProvider for date/time pickers
 */
export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            {children}
          </LocalizationProvider>
        </ThemeProvider>
      </CacheProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Re-export commonly used utilities from testing-library
 * 
 * Note: We explicitly list exports instead of using `export *` to:
 * 1. Satisfy ESLint rules about restricted imports
 * 2. Make it clear what's available from this module
 * 3. Avoid accidentally exporting unwanted utilities
 */
export {
  screen,
  within,
  waitFor,
  waitForElementToBeRemoved,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
