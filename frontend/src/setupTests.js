// jest-dom adds custom jest matchers for asserting on DOM nodes.
// https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// react-router@7 (upgraded from v6 - see docs/roadmap.md Phase 6 item 1's
// react-router advisory) references the web-standard TextEncoder/
// TextDecoder APIs internally. CRA's bundled Jest/jsdom test environment
// (react-scripts 5.x) doesn't polyfill these globally the way a real
// browser or webpack's dev/prod builds do - the actual app (built via
// `react-scripts build`, verified separately) is unaffected, this is
// purely a Jest test-environment gap. Node's own `util` module has both.
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
