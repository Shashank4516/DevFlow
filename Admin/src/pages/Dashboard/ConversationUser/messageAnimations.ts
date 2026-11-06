/**
 * iOS-style message motion: a new bubble rises and grows out of its bottom corner, then
 * settles with a soft spring. The conversation glides up to make room.
 */
import gsap from "gsap";

const DURATION = 0.36;
const SOFT_SPRING = "back.out(1.2)";
const GLIDE = "power3.out";

const SENT = { rise: 28, scale: 0.92, origin: "100% 100%" };
const RECEIVED = { rise: 10, scale: 0.94, origin: "0% 100%" };

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Plays the entrance for one new row. The list must already be in its final position. */
export const animateMessageIn = (row: HTMLElement, isMine: boolean) => {
  if (prefersReducedMotion()) return;
  const target = row.querySelector<HTMLElement>(".conversation-list");
  if (!target) return;
  const { rise, scale, origin } = isMine ? SENT : RECEIVED;
  gsap
    .timeline({ onComplete: () => gsap.set(target, { clearProps: "transform,transformOrigin,opacity" }) })
    .set(target, { transformOrigin: origin })
    .fromTo(target, { y: rise, scale }, { y: 0, scale: 1, duration: DURATION, ease: SOFT_SPRING }, 0)
    .fromTo(target, { opacity: 0 }, { opacity: 1, duration: DURATION * 0.4, ease: "none" }, 0);
};

/** The typing bubble grows in the same way a received message does. */
export const animateTypingIn = (bubble: HTMLElement) => {
  if (prefersReducedMotion()) return;
  gsap.fromTo(
    bubble,
    { scale: RECEIVED.scale - 0.14, opacity: 0, transformOrigin: RECEIVED.origin },
    {
      scale: 1,
      opacity: 1,
      duration: 0.28,
      ease: SOFT_SPRING,
      clearProps: "transform,transformOrigin,opacity",
    },
  );
};

/** Glides the list from `fromY` back to its natural position. */
export const slideListUp = (list: HTMLElement, fromY: number, onComplete: () => void) => {
  if (prefersReducedMotion() || Math.abs(fromY) < 1) {
    onComplete();
    return;
  }
  gsap.fromTo(
    list,
    { y: fromY },
    {
      y: 0,
      duration: DURATION,
      ease: GLIDE,
      overwrite: true,
      clearProps: "transform",
      onComplete,
    },
  );
};

/** Removes any list offset left by an earlier slide and returns what it was. */
export const settleList = (list: HTMLElement) => {
  gsap.killTweensOf(list);
  const currentY = Number(gsap.getProperty(list, "y")) || 0;
  gsap.set(list, { y: 0 });
  return currentY;
};

/** Fades the Delivered or Read label in. */
export const fadeInStatus = (label: HTMLElement) => {
  if (prefersReducedMotion()) return;
  gsap.fromTo(
    label,
    { opacity: 0 },
    { opacity: 1, duration: 0.2, delay: 0.14, ease: "none", clearProps: "opacity" },
  );
};
