import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TabularDataMatrix } from '@/lib/types';

interface Props {
  data: TabularDataMatrix;
}

export function VirtualizedGrid({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 15,
  });

  if (!data.columns.length || !data.rows.length) return null;

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto bg-slate-900/40">
      {/* Table wrapper with horizontal scroll */}
      <div className="min-w-fit">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex border-b border-slate-700 bg-slate-800/95 backdrop-blur-sm">
          {data.columns.map((col) => (
            <div
              key={col}
              className="shrink-0 px-4 py-2 text-xs font-medium text-slate-300 uppercase tracking-wider"
              style={{ minWidth: '150px' }}
            >
              {col}
            </div>
          ))}
        </div>

        {/* Virtualized Body */}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = data.rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className="flex border-b border-slate-800 items-center hover:bg-slate-800/30 transition-colors"
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                {data.columns.map((col) => (
                  <div
                    key={col}
                    className="shrink-0 px-4 py-1 text-xs text-slate-300 truncate"
                    style={{ minWidth: '150px' }}
                    title={String(row[col] ?? '')} // Show full value on hover
                  >
                    {row[col] !== undefined && row[col] !== null ? String(row[col]) : ''}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}