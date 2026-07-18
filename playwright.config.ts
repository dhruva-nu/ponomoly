import { defineConfig } from "@playwright/test";

// E2E config for the sound-effects test. Assumes `next dev` (:3000) and
// `wrangler dev` (:8787) are already running locally — see e2e/sounds.spec.ts.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    // Let the SFX Audio elements start without a user gesture so the play() spy
    // records them in headless Chromium.
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
});
