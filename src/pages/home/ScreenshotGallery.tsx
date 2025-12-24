/**
 * ScreenshotGallery.tsx
 *
 * Horizontal screenshot carousel for landing page.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScreenshotItem {
  src: string;
  alt: string;
  captionKey: string;
}

const ScreenshotGallery: React.FC = () => {
  const { t } = useTranslation();
  
  const images: ScreenshotItem[] = [
    { src: 'https://i.ibb.co/XxKfn78F/snep-1.png', alt: 'Market', captionKey: 'landing.screenshots.market' },
    { src: 'https://i.ibb.co/m5R14cJq/snep-2.png', alt: 'Card', captionKey: 'landing.screenshots.card' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/7d42a86b-03ff-428a-9824-4db7b0275355.jpg', alt: 'Highway', captionKey: 'landing.screenshots.highway' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/adc0a620-455a-49fe-a86b-dd9a3b99c731.jpg', alt: 'Cargo', captionKey: 'landing.screenshots.cargo' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/18489a1d-8da9-473d-952b-1acc504d5fd7.jpg', alt: 'Urban', captionKey: 'landing.screenshots.urban' },
    { src: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/0b93d2ff-6d0c-42ee-975f-2fc8dfd72ec3.jpg', alt: 'UI', captionKey: 'landing.screenshots.ui' }
  ];

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hasPrev, setHasPrev] = React.useState(false);
  const [hasNext, setHasNext] = React.useState(true);

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
    window.addEventListener('resize', updateButtons);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateButtons);
    };
  }, [updateButtons]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = containerRef.current;
    if (!el) return;
    const offset = el.clientWidth * direction;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="screenshots" className="mb-10">
      <h2 id="screenshots" className="text-2xl font-bold text-white mb-4">{t('landing.headings.screenshots_title')}</h2>
      <p className="text-slate-300 mb-4">{t('landing.headings.screenshots_desc')}</p>

      <div className="relative">
        <button
          onClick={() => scrollByPage(-1)}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-2 bg-black/40 backdrop-blur-sm border border-slate-700 text-white hover:bg-black/60 transition-colors ${hasPrev ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => scrollByPage(1)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-2 bg-black/40 backdrop-blur-sm border border-slate-700 text-white hover:bg-black/60 transition-colors ${hasNext ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={containerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-2 py-2 snap-x snap-mandatory touch-pan-x"
        >
          {images.map((img, idx) => (
            <article
              key={idx}
              className="bg-white rounded-xl overflow-hidden border shadow-sm snap-start flex-shrink-0 min-w-[80%] sm:min-w-[46%] lg:min-w-[30%]"
            >
              <div className="w-full h-48 sm:h-56 lg:h-64 overflow-hidden">
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <div className="text-sm text-slate-700 font-medium">{t(img.captionKey)}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScreenshotGallery;