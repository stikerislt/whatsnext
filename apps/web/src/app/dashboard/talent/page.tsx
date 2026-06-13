'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiAuth } from '@/lib/api';
import { EmployeeDetailModal } from '@/components/entity-modals';

interface Employee {
  id: string;
  name: string;
  title?: string;
  loadPct: number;
  capacityFreePct: number;
  skillsList: string[];
  cvDocument?: { fileName: string; parseStatus: string; extractedSkills?: { skills?: string[]; background?: string } } | null;
  workSplit?: { strategicPct: number; operationalPct: number; meetingsPct: number } | null;
  department?: { name: string };
}

interface ScrapeResult {
  employeeName: string;
  extractedSkills: string[];
  background?: string;
  sourceFormat?: string;
}

interface BatchResult {
  ok: boolean;
  fileName: string;
  employeeId?: string;
  employeeName?: string;
  extractedSkills?: string[];
  background?: string;
  sourceFormat?: string;
  error?: string;
}

export default function TalentPage() {
  const [people, setPeople] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');
  const [batchTargets, setBatchTargets] = useState<Employee[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const batchRef = useRef<HTMLInputElement>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (skillFilter) params.set('skill', skillFilter);
    apiAuth<Employee[]>(`/employees?${params}`).then(setPeople).catch(console.error);
  };

  useEffect(() => {
    load();
  }, [search, skillFilter]);

  const filters = ['React', 'TypeScript', 'Backend', 'Data', 'Product', 'Design', 'HR', 'Marketing'];

  const uploadCv = async (empId: string, file: File) => {
    setUploadingId(empId);
    try {
      const token = localStorage.getItem('wn_token');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/employees/${empId}/cv`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const emp = people.find((p) => p.id === empId);
      setScrapeResult({
        employeeName: data.employee?.name ?? emp?.name ?? 'Employee',
        extractedSkills: data.extractedSkills ?? [],
        background: data.background,
        sourceFormat: data.sourceFormat,
      });
      load();
    } catch (e) {
      console.error(e);
      alert(`CV upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setUploadingId(null);
    }
  };

  const openBatch = async () => {
    try {
      const all = await apiAuth<Employee[]>('/employees');
      const targets = all.filter((p) => !p.cvDocument);
      setBatchTargets(targets);
      setBatchResults(null);
      setBatchOpen(true);
    } catch (e) {
      alert('Could not load employees for batch upload.');
      console.error(e);
    }
  };

  const batchUpload = async (files: FileList) => {
    const noCv = batchTargets.length ? batchTargets : people.filter((p) => !p.cvDocument);
    if (!noCv.length) {
      alert('All employees already have a CV uploaded.');
      return;
    }
    setBatchBusy(true);
    setBatchStatus(`Scanning ${files[0]?.name ?? 'CV'}…`);
    try {
      const token = localStorage.getItem('wn_token');
      const form = new FormData();
      const ids: string[] = [];
      for (let i = 0; i < Math.min(files.length, noCv.length); i++) {
        form.append('files', files[i]);
        ids.push(noCv[i].id);
      }
      form.append('employeeIds', JSON.stringify(ids));
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/employees/cv/batch`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        },
      );
      const body = await res.text();
      if (!res.ok) throw new Error(body || res.statusText);
      const results = JSON.parse(body) as BatchResult[];
      setBatchResults(results);
      setBatchOpen(false);
      load();
    } catch (e) {
      console.error(e);
      alert(`Batch upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setBatchBusy(false);
      setBatchStatus('');
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.csv,.txt,.png,.jpg,.jpeg,.tif,.tiff"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = fileRef.current?.dataset.employeeId;
          if (file && id) uploadCv(id, file);
          e.target.value = '';
        }}
      />
      <input
        ref={batchRef}
        type="file"
        accept=".pdf,.csv,.txt,.png,.jpg,.jpeg,.tif,.tiff"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) batchUpload(e.target.files);
          e.target.value = '';
        }}
      />

      {scrapeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setScrapeResult(null)}>
          <div className="wn-card p-5 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-1">CV scraped successfully</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Skills registered for <strong>{scrapeResult.employeeName}</strong>
              {scrapeResult.background && <> · {scrapeResult.background} background</>}
              {scrapeResult.sourceFormat && scrapeResult.sourceFormat !== 'demo' && (
                <> · parsed from {scrapeResult.sourceFormat.toUpperCase()}</>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {scrapeResult.extractedSkills.map((s) => (
                <span key={s} className="tag-strategic">
                  {s}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mb-3">These talents are now visible in Talent Marketplace AI matching.</p>
            <div className="flex gap-2">
              <Link href="/dashboard/marketplace" className="wn-btn-primary text-xs" onClick={() => setScrapeResult(null)}>
                View Marketplace
              </Link>
              <button type="button" className="wn-btn-ghost text-xs" onClick={() => setScrapeResult(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {batchResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBatchResults(null)}>
          <div className="wn-card p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-3">Batch CV results</h3>
            <div className="space-y-3">
              {batchResults.map((r) => (
                <div key={r.fileName + (r.employeeId ?? '')} className={`text-xs p-3 rounded-lg border ${r.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="font-semibold">{r.fileName}</div>
                  {r.ok ? (
                    <>
                      <div className="text-[var(--muted)] mt-1">
                        → {r.employeeName}
                        {r.sourceFormat && ` · ${r.sourceFormat.toUpperCase()}`}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(r.extractedSkills ?? []).map((s) => (
                          <span key={s} className="tag-strategic">
                            {s}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-red-600 mt-1">{r.error ?? 'Failed'}</div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="wn-btn-primary text-xs mt-4 w-full" onClick={() => setBatchResults(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {batchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !batchBusy && setBatchOpen(false)}>
          <div className="wn-card p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-2">Batch CV upload</h3>
            <p className="text-xs text-[var(--muted)] mb-2">
              Files are matched in order to employees without a CV ({batchTargets.length} available). Scanned PDFs use OCR (~5–30s each).
            </p>
            {batchTargets.length > 0 && (
              <ul className="text-[10px] text-gray-600 mb-3 max-h-24 overflow-y-auto list-disc pl-4 space-y-0.5">
                {batchTargets.slice(0, 8).map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
                {batchTargets.length > 8 && <li>…and {batchTargets.length - 8} more</li>}
              </ul>
            )}
            {batchBusy && batchStatus && (
              <p className="text-xs text-[var(--v)] font-semibold mb-3 animate-pulse">{batchStatus}</p>
            )}
            <button
              type="button"
              className="wn-btn-primary text-xs w-full"
              disabled={batchBusy || batchTargets.length === 0}
              onClick={() => batchRef.current?.click()}
            >
              {batchBusy ? 'Processing…' : batchTargets.length ? 'Select CV files' : 'No employees available'}
            </button>
            <button type="button" className="wn-btn-ghost text-xs w-full mt-2" disabled={batchBusy} onClick={() => setBatchOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold">Talent Database</h2>
          <p className="text-[10.5px] text-[var(--muted)]">
            Upload PDF, CSV, or image CVs per person — skills sync to Talent Marketplace
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="wn-btn-ghost text-xs" onClick={() => openBatch()}>
            Batch CV upload
          </button>
          <Link href="/dashboard/marketplace" className="wn-btn-primary text-xs">
            AI Match
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <input
          className="border border-[var(--border)] rounded-lg px-4 py-2 text-sm max-w-md"
          placeholder="Search by name, role, skill…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSkillFilter(skillFilter === f ? null : f)}
              className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${skillFilter === f ? 'bg-[var(--v)] text-white border-[var(--v)]' : 'border-[var(--border)] text-gray-600 hover:border-[var(--v)]'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {people.map((p) => (
          <div key={p.id} className="wn-card p-4 hover:border-[var(--v)] transition-all">
            <button type="button" onClick={() => setEmployeeId(p.id)} className="w-full text-left cursor-pointer">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--v)] text-white flex items-center justify-center text-xs font-bold">
                  {p.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-[10px] text-gray-500">
                    {p.title} · {p.department?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${p.loadPct > 100 ? 'text-red-500' : p.loadPct > 85 ? 'text-amber-500' : 'text-green-600'}`}>
                    {p.loadPct}%
                  </div>
                  <div className="text-[9px] text-gray-400">{p.loadPct > 100 ? 'Overloaded' : p.loadPct < 85 ? 'Available' : 'Active'}</div>
                </div>
              </div>
              {p.workSplit && (
                <div className="flex h-1.5 rounded overflow-hidden mb-2">
                  <div style={{ width: `${p.workSplit.strategicPct}%`, background: 'var(--v)' }} />
                  <div style={{ width: `${p.workSplit.operationalPct}%`, background: 'var(--b)' }} />
                  <div style={{ width: `${p.workSplit.meetingsPct}%`, background: '#94A3B8' }} />
                </div>
              )}
              <div className="flex flex-wrap gap-1 mb-3">
                {p.skillsList?.length ? (
                  p.skillsList.slice(0, 5).map((s) => (
                    <span key={s} className="tag-strategic">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-amber-600 font-semibold">No skills — upload CV to scrape</span>
                )}
              </div>
            </button>
            <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
              <span className={`text-[10px] font-semibold ${p.cvDocument ? 'text-green-600' : 'text-red-500'}`}>
                {p.cvDocument ? `✓ CV · ${p.cvDocument.parseStatus}` : '✗ No CV'}
              </span>
              <button
                type="button"
                className="text-[10px] text-[var(--v)] font-bold cursor-pointer"
                disabled={uploadingId === p.id}
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.dataset.employeeId = p.id;
                    fileRef.current.click();
                  }
                }}
              >
                {uploadingId === p.id ? 'Scraping…' : p.cvDocument ? 'Re-upload CV' : 'Upload CV'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <EmployeeDetailModal employeeId={employeeId} onClose={() => setEmployeeId(null)} />
    </>
  );
}
