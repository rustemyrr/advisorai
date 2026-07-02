import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([{
    extends: [...nextCoreWebVitals],
    rules: {
        // New in eslint-config-next 16 (React Compiler prep). Flags common,
        // legitimate patterns (fetch-on-mount, syncing from localStorage) as
        // errors — keep visible as a warning rather than block builds/CI.
        "react-hooks/set-state-in-effect": "warn",
    },
}]);