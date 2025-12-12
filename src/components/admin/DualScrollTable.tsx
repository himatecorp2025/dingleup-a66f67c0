import { useRef, useEffect, ReactNode } from 'react';

interface DualScrollTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * A wrapper that provides synchronized horizontal scrollbars at both top and bottom of a table.
 */
const DualScrollTable = ({ children, className = '' }: DualScrollTableProps) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;
    const content = contentRef.current;

    if (!topScroll || !bottomScroll || !content) return;

    // Sync scroll positions
    const handleTopScroll = () => {
      if (bottomScroll) {
        bottomScroll.scrollLeft = topScroll.scrollLeft;
      }
    };

    const handleBottomScroll = () => {
      if (topScroll) {
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    bottomScroll.addEventListener('scroll', handleBottomScroll);

    // Update top scroller width to match content
    const updateWidth = () => {
      if (content && topScroll) {
        const spacer = topScroll.querySelector('.scroll-spacer') as HTMLElement;
        if (spacer) {
          spacer.style.width = `${content.scrollWidth}px`;
        }
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(content);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={className}>
      {/* Top scrollbar */}
      <div
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden h-3 mb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="scroll-spacer h-1" style={{ minWidth: '100%' }} />
      </div>

      {/* Content with bottom scrollbar */}
      <div
        ref={bottomScrollRef}
        className="overflow-x-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div ref={contentRef} className="min-w-max">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DualScrollTable;
