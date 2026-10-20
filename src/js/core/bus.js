/* Tiny event bus so modules can react to settings changes without importing each other. */
const handlers = new Map();
export const bus = {
  on(type, fn) { (handlers.get(type) || handlers.set(type, new Set()).get(type)).add(fn); return () => handlers.get(type).delete(fn); },
  emit(type, detail) { (handlers.get(type) || []).forEach(fn => { try { fn(detail); } catch (e) { console.error(e); } }); },
};
