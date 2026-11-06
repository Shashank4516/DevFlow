/**
 * Demo mode: run the app with no PHP backend, MySQL or Firebase.
 * Start it with `npm run demo`, which loads `.env.demo`. Normal `npm run dev` and
 * `npm run build` never enable it.
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export const DEMO_CALLS_DISABLED_MESSAGE =
  "Live video calling needs the real-time backend, which is switched off in this demo.";
