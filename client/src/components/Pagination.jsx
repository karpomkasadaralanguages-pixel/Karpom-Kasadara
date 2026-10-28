import React from 'react';

// Numbered pager: ‹ Prev  1 … 4 5 6 … 12  Next ›
export default function Pagination({ page, totalPages, total, onChange, noun = 'items' }) {
  if (totalPages <= 1) return null;
  const list = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items = [];
  list.forEach((n, i) => { if (i && n - list[i - 1] > 1) items.push('…'); items.push(n); });

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}
          className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white disabled:opacity-40">‹ Prev</button>
        {items.map((n, i) => n === '…'
          ? <span key={`gap-${i}`} className="px-2 text-gray-400">…</span>
          : <button key={n} onClick={() => onChange(n)}
              className={`min-w-[36px] px-2 py-1.5 text-sm rounded border ${n === page ? 'bg-primary-700 text-white border-primary-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{n}</button>
        )}
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white disabled:opacity-40">Next ›</button>
      </div>
      <p className="text-xs text-gray-400">Page {page} of {totalPages} · {total} {noun}</p>
    </div>
  );
}
