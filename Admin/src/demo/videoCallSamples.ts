/**
 * Sample "video feeds" for demo mode, from the Figma design. Loaded lazily, so that
 * they stay out of normal builds. Live calling is off in the demo.
 */
import mainFeed from "./video-call/main.jpg";
import cassie from "./video-call/thumb-1.jpg";
import alice from "./video-call/thumb-2.jpg";
import theresa from "./video-call/thumb-3.jpg";
import christian from "./video-call/thumb-4.jpg";
import { DEMO_USER_ID } from "./demoData";

export type DemoFeed = {
  image: string;
  crop: { left: number; top: number; width: number; height: number };
  /** Framed for the big video, not for a thumbnail. */
  isMainFeed?: boolean;
  /** This photo has black bars at its edges, which the design's crop hides. */
  zoom?: number;
};

const THUMB_W = 296.81;
const THUMB_H = 181.291;

/** Crops are in percent of the tile, from the design's image frames. */
const thumbFeed = (image: string, x: number, y: number, w: number, h: number): DemoFeed => ({
  image,
  crop: {
    left: (x / THUMB_W) * 100,
    top: (y / THUMB_H) * 100,
    width: (w / THUMB_W) * 100,
    height: (h / THUMB_H) * 100,
  },
});

const MAIN_FEED: DemoFeed = {
  image: mainFeed,
  isMainFeed: true,
  crop: {
    left: (-35 / 1248) * 100,
    top: (-11 / 560) * 100,
    width: (1317 / 1248) * 100,
    height: (877 / 560) * 100,
  },
};

const CASSIE = thumbFeed(cassie, -24, -5, 344, 230);
const ALICE = thumbFeed(alice, -58.51, -35, 404.246, 269.128);
const THERESA = { ...thumbFeed(theresa, -76.02, -50, 454, 311), zoom: 1.45 };
const CHRISTIAN = thumbFeed(christian, -120.52, -19, 505, 283);

/** Matches each demo teammate to a feed. Anyone not listed joins with their camera off. */
const FEEDS: Record<string, DemoFeed> = {
  [DEMO_USER_ID]: CHRISTIAN,
  9002: MAIN_FEED, // Aarav
  9003: CASSIE, // Priya
  9004: MAIN_FEED, // Rohan
  9005: ALICE, // Ananya
  9007: THERESA, // Neha
};

export const demoFeedFor = (userId: string | number) => FEEDS[String(userId)] || null;
