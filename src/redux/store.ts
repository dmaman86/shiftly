import { configureStore } from "@reduxjs/toolkit";
import workDaysReducer from "./states/workDaysSlice";
import globalReducer from "./states/globalSlice";

export const store = configureStore({
  reducer: {
    workDays: workDaysReducer,
    global: globalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
