/**
 * The "smooth follow" of the floating card: while a scroll container moves, the card trails a little behind it (nudged
 * along with the content, easing back once the scrolling stops) instead of being rigidly glued to the screen. It only ever
 * sets a `transform` through requestAnimationFrame, so it never causes layout work and cannot jitter.
 *
 * Returns the function that stops following. Does nothing for people who asked their device to reduce motion.
 */
export function attachSmoothFollow(scroller: EventTarget, readY: () => number, element: HTMLElement): () => void {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return () => undefined;
  }

  const MAX_LAG_PX = 36;
  let lastY = readY();
  let target = 0;
  let current = 0;
  let frame = 0;

  const tick = () => {
    current += (target - current) * 0.14;
    target *= 0.9;
    if (Math.abs(current) < 0.1 && Math.abs(target) < 0.1) {
      current = 0;
      target = 0;
      frame = 0;
      element.style.transform = '';
      return;
    }

    element.style.transform = `translate3d(0, ${current.toFixed(2)}px, 0)`;
    frame = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    const y = readY();
    const delta = y - lastY;
    lastY = y;
    target = Math.max(-MAX_LAG_PX, Math.min(MAX_LAG_PX, target - delta * 0.5));
    if (!frame) {
      frame = requestAnimationFrame(tick);
    }
  };

  scroller.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    scroller.removeEventListener('scroll', onScroll);
    if (frame) {
      cancelAnimationFrame(frame);
    }
    element.style.transform = '';
  };
}
