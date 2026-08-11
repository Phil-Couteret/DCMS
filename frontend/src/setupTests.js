// jest-dom adds custom matchers for asserting on DOM nodes. Works under
// Vitest too (its `expect` is Jest-API-compatible by design).
import '@testing-library/jest-dom';

// Defensive TextEncoder/TextDecoder polyfill for react-router@7's internals
// (see docs/roadmap.md Phase 6 item 16). Vitest's jsdom environment is more
// current than CRA's old bundled Jest/jsdom ever was and likely already has
// both natively, but this is a harmless no-op guard if it ever doesn't.
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
