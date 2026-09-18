/** Set once from store/index.js to avoid circular imports in toast helper. */
export let store = null;

export function setStore(s) {
  store = s;
}
