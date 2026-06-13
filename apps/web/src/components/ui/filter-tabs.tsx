'use client';

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-0.5 bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border-none cursor-pointer transition-colors ${
            value === o.id ? 'bg-[var(--v)] text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-[var(--v)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
