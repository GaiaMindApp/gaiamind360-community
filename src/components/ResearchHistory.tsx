import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import researchService, { ResearchPublication } from '../services/researchService';

export default function ResearchHistory() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ResearchPublication[]>([]);
  const [filtered, setFiltered] = useState<ResearchPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResearch, setSelectedResearch] = useState<ResearchPublication | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setFiltered(history); return; }
    const q = searchQuery.toLowerCase();
    setFiltered(history.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.research_id.toLowerCase().includes(q)
    ));
  }, [history, searchQuery]);

  const loadHistory = async () => {
    try {
      setLoading(true); setError(null);
      const data = await researchService.getHistory();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('research.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOne = async (researchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(researchId);
    try {
      await researchService.deleteResearch(researchId);
      setHistory(h => h.filter(r => r.research_id !== researchId));
      if (selectedResearch?.research_id === researchId) setSelectedResearch(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('research.error_delete'));
      setTimeout(() => setError(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await researchService.deleteAllResearch();
      setHistory([]);
      setSelectedResearch(null);
      setConfirmDeleteAll(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('research.error_delete_all'));
      setTimeout(() => setError(null), 4000);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleExport = async (researchId: string, format: 'json' | 'csv', e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const blob = await researchService.exportResearch(researchId, format);
      researchService.downloadFile(blob, `research_${researchId}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('research.error_export'));
      setTimeout(() => setError(null), 4000);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(224,247,250,0.4)' }}>
      {t('research.history_loading')}
    </div>
  );

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selectedResearch) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,230,118,0.2)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ color: '#00E676', fontSize: 'clamp(1rem, 4vw, 1.4rem)', margin: 0 }}>👁️ {selectedResearch.title}</h2>
          <button onClick={() => setSelectedResearch(null)}
            style={btnIcon}>
            <X size={18} />
          </button>
        </div>

        <div style={{ borderBottom: '1px solid rgba(0,230,118,0.1)', paddingBottom: '1rem' }}>
          <p style={metaText}><strong style={metaLabel}>{t('research.detail_rows')}:</strong> {selectedResearch.analysis.rows} &nbsp;|&nbsp; <strong style={metaLabel}>{t('research.detail_columns')}:</strong> {selectedResearch.analysis.columns}</p>
          <p style={{ ...metaText, wordBreak: 'break-word', marginTop: '0.25rem' }}><strong style={metaLabel}>{t('research.detail_variables')}:</strong> {selectedResearch.analysis.column_names.join(', ')}</p>
        </div>

        {/* Data table */}
        <div>
          <h3 style={sectionTitle}>{t('research.detail_preview')}</h3>
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead style={theadStyle}>
                <tr>
                  {selectedResearch.analysis.column_names.map(col => {
                    const isNum = selectedResearch.analysis.statistics[col] !== undefined;
                    return <th key={col} style={{ ...thStyle, textAlign: isNum ? 'right' : 'left' }}>{col}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {selectedResearch.analysis.data_preview?.map((row: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(0,230,118,0.07)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,48,73,0.2)' }}>
                    {selectedResearch.analysis.column_names.map(col => {
                      const isNum = selectedResearch.analysis.statistics[col] !== undefined;
                      const val = row[col];
                      return <td key={col} style={{ ...tdStyle, textAlign: isNum ? 'right' : 'left' }}>{typeof val === 'number' ? val.toFixed(2) : val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics */}
        <div>
          <h3 style={sectionTitle}>{t('research.detail_statistics')}</h3>
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead style={theadStyle}>
                <tr>{[t('research.stat_variable'), t('research.stat_mean'), t('research.stat_std'), t('research.stat_min'), t('research.stat_max')].map(h => <th key={h} style={{ ...thStyle, textAlign: h === t('research.stat_variable') ? 'left' : 'right' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {Object.entries(selectedResearch.analysis.statistics).map(([col, stats]: [string, any], idx) => (
                  <tr key={col} style={{ borderBottom: '1px solid rgba(0,230,118,0.07)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,48,73,0.2)' }}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: '#E0F7FA' }}>{col}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{stats.mean?.toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{stats.std?.toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{stats.min?.toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{stats.max?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed insights */}
        {selectedResearch.analysis.detailed_insights?.length > 0 && (
          <div>
            <h3 style={sectionTitle}>{t('research.detail_analysis')}</h3>
            {selectedResearch.analysis.detailed_insights.map((s: any, i: number) => (
              <div key={i} style={{ borderLeft: '3px solid #00E676', paddingLeft: '1rem', marginBottom: '0.75rem' }}>
                <h4 style={{ color: '#00E676', fontSize: '0.875rem', marginBottom: '0.4rem' }}>{s.section}</h4>
                <pre style={{ fontSize: '0.75rem', color: 'rgba(224,247,250,0.75)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,48,73,0.4)', padding: '0.75rem', borderRadius: '0.375rem', maxHeight: '200px', overflowY: 'auto', margin: 0 }}>{s.content}</pre>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid rgba(0,230,118,0.1)' }}>
          <button onClick={() => handleExport(selectedResearch.research_id, 'json')} style={btnBlue}>
            <Download size={15} /> {t('research.export_json')}
          </button>
          <button onClick={() => handleExport(selectedResearch.research_id, 'csv')} style={btnBlue}>
            <Download size={15} /> {t('research.export_csv')}
          </button>
          <button onClick={(e) => handleDeleteOne(selectedResearch.research_id, e)} disabled={deletingId === selectedResearch.research_id} style={{ ...btnRed, marginLeft: 'auto' }}>
            <Trash2 size={15} /> {deletingId === selectedResearch.research_id ? t('research.detail_deleting') : t('research.detail_delete')}
          </button>
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '0.5rem', color: '#ff6b6b', fontSize: '0.82rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Toolbar: search + delete all */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(224,247,250,0.35)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={t('research.history_search_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', background: 'rgba(0,48,73,0.5)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '0.5rem', color: '#E0F7FA', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', minHeight: '44px' }}
          />
        </div>

        {history.length > 0 && !confirmDeleteAll && (
          <button onClick={() => setConfirmDeleteAll(true)} style={{ ...btnRed, flexShrink: 0 }}>
            <Trash2 size={15} /> {t('research.history_delete_all', { count: history.length })}
          </button>
        )}

        {confirmDeleteAll && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', flexWrap: 'wrap' }}>
            <AlertTriangle size={15} style={{ color: '#ff6b6b', flexShrink: 0 }} />
            <span style={{ color: 'rgba(224,247,250,0.8)', fontSize: '0.8rem' }}>{t('research.history_confirm_delete_all', { count: history.length })}</span>
            <button onClick={handleDeleteAll} disabled={deletingAll}
              style={{ padding: '0.3rem 0.75rem', background: 'rgba(255,107,107,0.25)', border: '1px solid rgba(255,107,107,0.5)', borderRadius: '0.375rem', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: '32px' }}>
              {deletingAll ? t('research.history_deleting') : t('research.history_confirm')}
            </button>
            <button onClick={() => setConfirmDeleteAll(false)}
              style={{ padding: '0.3rem 0.75rem', background: 'transparent', border: '1px solid rgba(224,247,250,0.2)', borderRadius: '0.375rem', color: 'rgba(224,247,250,0.6)', cursor: 'pointer', fontSize: '0.78rem', minHeight: '32px' }}>
              {t('research.history_cancel')}
            </button>
          </div>
        )}
      </div>

      {/* Count */}
      {history.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'rgba(224,247,250,0.35)' }}>
          {searchQuery
            ? t('research.history_count_matching', { filtered: filtered.length, total: history.length, query: searchQuery })
            : t('research.history_count', { filtered: filtered.length, total: history.length })}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(224,247,250,0.3)', fontSize: '0.875rem' }}>
          {history.length === 0 ? t('research.history_empty') : t('research.history_no_results')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(r => (
            <div key={r.research_id}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(0,48,73,0.35)', border: '1px solid rgba(0,230,118,0.12)', borderRadius: '0.625rem', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', minHeight: '52px' }}
              onClick={() => setSelectedResearch(r)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,230,118,0.35)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,48,73,0.55)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,230,118,0.12)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,48,73,0.35)'; }}
            >
              {/* Title + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#E0F7FA', fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                <div style={{ color: 'rgba(224,247,250,0.4)', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                  {r.analysis?.rows ?? '—'} {t('research.history_rows')} · {r.analysis?.columns ?? '—'} {t('research.history_cols')}
                  {r.published_date && ` · ${new Date(r.published_date).toLocaleDateString()}`}
                </div>
              </div>

              {/* Inline actions — stop propagation so click doesn't open detail */}
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={e => handleExport(r.research_id, 'json', e)} title="Export JSON"
                  style={{ ...btnIconSmall, color: '#4A9EFF', borderColor: 'rgba(74,158,255,0.3)' }}>
                  <Download size={14} />
                </button>
                <button onClick={e => handleDeleteOne(r.research_id, e)} title="Delete" disabled={deletingId === r.research_id}
                  style={{ ...btnIconSmall, color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}>
                  {deletingId === r.research_id ? '…' : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = { color: '#00E676', fontSize: '0.9rem', marginBottom: '0.625rem', fontWeight: 700 };
const metaText: React.CSSProperties = { color: 'rgba(224,247,250,0.75)', fontSize: '0.82rem', margin: 0 };
const metaLabel: React.CSSProperties = { color: '#E0F7FA' };
const tableWrap: React.CSSProperties = { overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '0.5rem', border: '1px solid rgba(0,230,118,0.15)' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: '360px' };
const theadStyle: React.CSSProperties = { background: 'rgba(0,48,73,0.6)', borderBottom: '1px solid rgba(0,230,118,0.2)' };
const thStyle: React.CSSProperties = { padding: '0.5rem 0.875rem', color: '#00E676', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '0.45rem 0.875rem', color: 'rgba(224,247,250,0.7)', fontSize: '0.78rem' };

const btnBase: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, minHeight: '36px', border: '1px solid' };
const btnBlue: React.CSSProperties = { ...btnBase, background: 'rgba(74,158,255,0.12)', borderColor: 'rgba(74,158,255,0.3)', color: '#4A9EFF' };
const btnRed: React.CSSProperties = { ...btnBase, background: 'rgba(255,107,107,0.1)', borderColor: 'rgba(255,107,107,0.3)', color: '#ff6b6b' };
const btnIcon: React.CSSProperties = { background: 'rgba(224,247,250,0.07)', border: '1px solid rgba(224,247,250,0.15)', borderRadius: '0.375rem', color: '#E0F7FA', cursor: 'pointer', padding: '0.5rem', minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const btnIconSmall: React.CSSProperties = { background: 'transparent', border: '1px solid', borderRadius: '0.375rem', cursor: 'pointer', padding: '0.35rem', minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
