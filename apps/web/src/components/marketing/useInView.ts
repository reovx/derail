"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fires once, the first time the element scrolls into view — the trigger for a
 * marketing reveal that should play as the reader reaches it, not on load while
 * it is still below the fold. It latches to `true` and disconnects, so the
 * sequence plays a single time (§19: nothing loops).
 *
 * The default `rootMargin` starts the reveal when the element is roughly a fifth
 * of the way up the viewport, which is far enough in that the reader is looking
 * right at it, and early enough that the opening frame is already the animation's
 * hidden start rather than the finished mock.
 *
 * Where there is no `IntersectionObserver` (very old clients), the trigger is
 * simply never armed, so the mock stays in its finished, static state — the same
 * graceful fallback a reduced-motion reader gets.
 */
export function useInView<T extends HTMLElement>(rootMargin = "0px 0px -20% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
