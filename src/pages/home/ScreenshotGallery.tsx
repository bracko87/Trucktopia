/**
 * ScreenshotGallery.tsx
 *
 * Horizontal screenshot carousel for landing page.
 *
 * Responsibilities:
 * - Render screenshots in a single horizontal line (carousel).
 * - Provide Prev/Next buttons to navigate between items.
 * - Use scroll-snap and smooth scrolling; supports keyboard navigation (left/right).
 *
 * Notes:
 * - Images are placeholders; replace URLs with real screenshots later.
 * - This component is intentionally presentational and small so it can be reused.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * ScreenshotItem
 * @description Minimal data shape for a screenshot item.
 */
interface ScreenshotItem {
  src: string;
  alt: string;
  caption?: string;
}

/**
 * ScreenshotGallery
 * @description Horizontal carousel that shows screenshot cards in a single row with controls.
 */
const ScreenshotGallery: React.FC = () => {
  const images: ScreenshotItem[] = [
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/6d87e5e4-3c79-428d-813d-674254180873.jpg', alt: 'Truck overview', caption: 'Fleet overview' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/056f37b3-3d07-45d1-810b-0a57d05d5f5e.jpg', alt: 'Truck in garage', caption: 'Garage & maintenance' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/7d42a86b-03ff-428a-9824-4db7b0275355.jpg', alt: 'Truck on highway', caption: 'Long-haul deliveries' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/adc0a620-455a-49fe-a86b-dd9a3b99c731.jpg', alt: 'Cargo loading', caption: 'Cargo & loading' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/18489a1d-8da9-473d-952b-1acc504d5fd7.jpg', alt: 'Urban delivery', caption: 'City routes' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/0b93d2ff-6d0c-42ee-975f-2fc8dfd72ec3.jpg', alt: 'In-game UI', caption: 'Compact staff / truck card' }
  ];

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hasPrev, setHasPrev] = React.useState(false);
  const [hasNext, setHasNext] = React.useState(true);

  /**
   * updateButtons
   * @description Update prev/next availability based on current scroll position.
   */
  const updateButtons = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    setHasPrev(scrollLeft > 5);
    setHasNext(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  React.useEffect(() => {
    updateButtons();
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => updateButtons();
    el.addEventListener('scroll', onScroll, { passive: true });
    // Recompute on resize so scroll distance changes are tracked
    window.addEventListener('resize', updateButtons);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateButtons);
    };
  }, [updateButtons]);

  /**
   * scrollByPage
   * @description Smoothly scroll the carousel by one viewport width.
   * @param direction -1 for prev, 1 for next
   */
  const scrollByPage = (direction: -1 | 1) => {
    const el = containerRef.current;
    if (!el) return;
    const offset = el.clientWidth * direction;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  /**
   * handleKeydown
   * @description Allow keyboard left/right navigation when the carousel is focused.
   */
  const handleKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      scrollByPage(-1);
    } else if (e.key === 'ArrowRight') {
      scrollByPage(1);
    }
  };

  return (
    <section aria-labelledby="screenshots" className="mb-10">
      <h2 id="screenshots" className="text-2xl font-bold text-white mb-4">Screenshots</h2>
      <p className="text-slate-300 mb-4">Below are a few representative screenshots. Replace these with your real images later.</p>

      <div className="relative">
        {/* Prev Button */}
        <button
          onClick={() => scrollByPage(-1)}
          aria-label="Previous screenshots"
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-2 bg-black/40 backdrop-blur-sm border border-slate-700 text-white hover:bg-black/60 transition-colors ${hasPrev ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next Button */}
        <button
          onClick={() => scrollByPage(1)}
          aria-label="Next screenshots"
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-2 bg-black/40 backdrop-blur-sm border border-slate-700 text-white hover:bg-black/60 transition-colors ${hasNext ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Scrollable row */}
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeydown}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-2 py-2 snap-x snap-mandatory touch-pan-x"
          role="list"
        >
          {images.map((img, idx) => (
            <article
              key={idx}
              role="listitem"
              className="bg-white rounded-xl overflow-hidden border shadow-sm snap-start flex-shrink-0 min-w-[80%] sm:min-w-[46%] lg:min-w-[30%]"
            >
              <div className="w-full h-48 sm:h-56 lg:h-64 overflow-hidden">
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <div className="text-sm text-slate-700 font-medium">{img.caption || 'In-game screenshot'}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScreenshotGallery;