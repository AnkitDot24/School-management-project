import { createSlice } from "@reduxjs/toolkit";

const token = localStorage.getItem("token");

const slice = createSlice({
  name: "auth",
  initialState: {
    token,
    user: null,
    institute: null,
    membership: null,
    roles: [],
    effectivePermissions: [],
    memberships: [],
    displayInstituteId: "",
    displayInstituteIdKind: "default",
    status: "idle",
    error: null
  },
  reducers: {
    setSession(state, action) {
      Object.assign(state, action.payload, { error: null });
      if (action.payload.token) localStorage.setItem("token", action.payload.token);
      if (action.payload.institute?._id) {
        localStorage.setItem("instituteId", action.payload.institute._id);
        if (action.payload.institute.code) localStorage.setItem("instituteCode", action.payload.institute.code);
      }
    },
    setError(state, action) {
      state.error = action.payload;
      state.status = "failed";
    },
    setStatus(state, action) {
      state.status = action.payload;
    },
    logout() {
      localStorage.removeItem("token");
      localStorage.removeItem("instituteId");
      localStorage.removeItem("instituteCode");
      return {
        token: null,
        user: null,
        institute: null,
        membership: null,
        roles: [],
        effectivePermissions: [],
        memberships: [],
        displayInstituteId: "",
        displayInstituteIdKind: "default",
        status: "idle",
        error: null
      };
    }
  }
});

export const { setSession, setError, setStatus, logout } = slice.actions;
export default slice.reducer;

export function can(perms, key, user) {
  if (!key) return true;
  if (user?.isSuperAdmin) return true;
  if (perms?.includes("*")) return true;
  return perms?.includes(key);
}
