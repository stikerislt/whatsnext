'use client';

import type { ReactNode } from 'react';

export function DetailModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,43,0.45)] backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white border border-[var(--border2)] rounded-2xl w-full max-w-xl max-h-[84vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="float-right text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="detail-modal-title" className="text-base font-extrabold tracking-tight pr-6">
          {title}
        </h2>
        {subtitle && <p className="text-[11.5px] text-[var(--muted)] mt-1 mb-4">{subtitle}</p>}
        {!subtitle && <div className="mb-4" />}
        <div className="clear-both">{children}</div>
        {footer && <div className="mt-5 pt-4 border-t border-[var(--border)] flex gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}
