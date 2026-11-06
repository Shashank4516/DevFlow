/**
 * Stands in for videoCallSamples.ts in every mode but demo (see vite.config.ts), so
 * that the sample photos are never copied into a normal build.
 */
export const demoFeedFor = (_userId: string | number): any => null;
