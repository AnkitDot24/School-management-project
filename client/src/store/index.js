import { configureStore } from "@reduxjs/toolkit";
import auth from "./authSlice.js";
import ui from "./uiSlice.js";
import { setStore } from "../lib/storeRef.js";

export const store = configureStore({
  reducer: { auth, ui }
});

setStore(store);
