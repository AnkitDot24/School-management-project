import { store } from "./storeRef.js";
import { pushToast, removeToast } from "../store/uiSlice.js";

function emit(text, type = "success", duration = 4000) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  store.dispatch(pushToast({ id, text, type }));
  window.setTimeout(() => store.dispatch(removeToast(id)), duration);
  return id;
}

export const toast = {
  success(message, duration) {
    return emit(message, "success", duration ?? 3500);
  },
  error(message, duration) {
    return emit(message, "error", duration ?? 5200);
  },
  info(message, duration) {
    return emit(message, "info", duration ?? 4000);
  },
  dismiss(id) {
    store.dispatch(removeToast(id));
  }
};
