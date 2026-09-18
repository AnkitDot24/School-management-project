import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
  name: "ui",
  initialState: { toasts: [], sidebarOpen: false },
  reducers: {
    pushToast(state, action) {
      state.toasts.push(action.payload);
    },
    removeToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
    },
    toggleSidebar(state, action) {
      state.sidebarOpen = action.payload ?? !state.sidebarOpen;
    }
  }
});

export const { pushToast, removeToast, clearToasts, toggleSidebar } = slice.actions;
export default slice.reducer;
