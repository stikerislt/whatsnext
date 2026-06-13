const LAYERS = [
  { name: 'Strategy Layer', desc: 'Goals → execution', color: '#9333EA', features: ['Goal breakdown', 'Prioritisation', 'Alignment tracking'] },
  { name: 'Execution Layer', desc: 'Track real work', color: '#2563EB', features: ['Task tracking', 'Sprint analysis', 'Bottleneck detection'] },
  { name: 'Talent Layer', desc: 'Match people to work', color: '#16A34A', features: ['Skill graph', 'Talent marketplace', 'Capacity tracking'] },
  { name: 'Data Layer', desc: 'Single source of truth', color: '#D97706', features: ['Unified ingestion', 'Real-time dashboards'] },
  { name: 'Interface Layer', desc: 'Enable fast decisions', color: '#e85d8a', features: ['Role dashboards', 'AI copilot', 'NL queries'] },
];

export default function LayersPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {LAYERS.map((l) => (
        <div key={l.name} className="wn-card p-4 hover:border-[var(--v)] cursor-pointer transition-all">
          <div className="w-9 h-9 rounded-lg mb-3" style={{ background: `${l.color}20` }} />
          <h3 className="font-semibold text-sm">{l.name}</h3>
          <p className="text-[11px] text-gray-500 mb-2">{l.desc}</p>
          <div className="flex flex-wrap gap-1">{l.features.map((f) => <span key={f} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded">{f}</span>)}</div>
        </div>
      ))}
    </div>
  );
}
