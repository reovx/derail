import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest's `globals: true` gives us the hooks, but not RTL's unmount between
// tests — without this a component rendered in one test is still in the
// document during the next, and queries start matching the wrong element.
afterEach(cleanup);
