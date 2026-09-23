import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToUp Component
 * Automatically scrolls the window to the top (0, 0) whenever navigating or redirecting to a new page.
 */
export default function ScrollToUp({ children = null }) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll window to top instantly on page transition
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    } catch {
      window.scrollTo(0, 0);
    }

    // Fallback for root scroll container
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [pathname]);

  return children;
}
