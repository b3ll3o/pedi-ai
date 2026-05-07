import '@testing-library/jest-dom';
// Polyfill IndexedDB for jsdom environment (required by Dexie)
import 'fake-indexeddb/auto';

// Polyfill matchMedia for jsdom (used by PWA and responsive hooks)
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
