import { useState, useEffect } from 'react';
import { Download, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { authFetch } from '../../../services/authFetch';
import { complete195Countries as worldCountriesData } from '../../../data/complete195Countries';
import { PageShell } from './PageShell';
import type { MapPage } from '../hooks/useMapState';

interface Props { onClose: () => void; onNavigate?: (page: MapPage) => void; currentPage?: MapPage; }

interface CountryRow {
  name: string; capital: string; continent: string;
  sustainability: number; co2: string; renewable: string;
  gdp: string; population: string; forest: string;
  dataYear: number | null; source: string;
}

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Países representativos por continente (8 por continente = 50 total)
const REPORT_COUNTRIES = [...worldCountriesData]
  .sort((a, b) => a.continent.localeCompare(b.continent))
  .reduce((acc, c) => {
    if (acc.filter(x => x.continent === c.continent).length < 8) acc.push(c);
    return acc;
  }, [] as typeof worldCountriesData)
  .slice(0, 50);

export function ExportPage({ onClose, onNavigate, currentPage }: Props) {
  const { t } = useTranslation();
  const { getRole } = useAuth();
  const role = getRole();
  const canAccess = role === 'owner' || role === 'analyst';

  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(false);
  const [done, setDone]         = useState<string | null>(null);
  const [rows, setRows]         = useState<CountryRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [dataReady, setDataReady] = useState(false);

  // Pré-carregar dados ao montar (só se tiver acesso)
  useEffect(() => {
    if (canAccess && rows.length === 0) fetchData();
  }, [canAccess]);

  const fetchData = async () => {
    setFetching(true);
    setProgress(0);
    const result: CountryRow[] = [];
    const batch = REPORT_COUNTRIES;

    for (let i = 0; i < batch.length; i++) {
      const c = batch[i];
      // Usar iso2 se existir, senão pular (evitar códigos inválidos)
      const countryCode = c.iso2;
      if (!countryCode || countryCode.length !== 2) {
        // Pular países sem código ISO válido
        result.push({ 
          name:c.country, capital:c.capital, continent:c.continent, 
          sustainability:0, co2:'—', renewable:'—', gdp:'—', 
          population:'—', forest:'—', dataYear:null, source:'N/A (no ISO code)' 
        });
        setProgress(Math.round(((i + 1) / batch.length) * 100));
        continue;
      }
      
      try {
        const r = await authFetch(`${BASE}/api/global-data/worldbank/${countryCode}`);
        if (r.ok) {
          const json = await r.json();
          const d = json?.data || {};
          const co2raw    = d.co2_emissions?.value;
          const renraw    = d.renewable_energy?.value;
          const gdpraw    = d.gdp_per_capita?.value;
          const popraw    = d.population?.value;
          const forraw    = d.forest_area?.value;
          const year      = d.co2_emissions?.year || d.renewable_energy?.year || null;

          const sustainability = (() => {
            if (!renraw && !co2raw && !forraw) return null;
            let s = 50;
            if (renraw) s += (renraw / 100) * 30;
            if (co2raw) s += Math.max(0, 25 - (co2raw / 20) * 25);
            if (forraw) s += (forraw / 100) * 20;
            return Math.min(100, Math.max(0, Math.round(s)));
          })();

          result.push({
            name: c.country, capital: c.capital, continent: c.continent,
            sustainability: sustainability ?? 0,
            co2:       co2raw  != null ? `${co2raw.toFixed(2)} t/cap`  : '—',
            renewable: renraw  != null ? `${renraw.toFixed(1)}%`       : '—',
            gdp:       gdpraw  != null ? `$${gdpraw.toLocaleString(undefined,{maximumFractionDigits:0})}` : '—',
            population:popraw  != null ? `${(popraw/1e6).toFixed(1)}M` : '—',
            forest:    forraw  != null ? `${forraw.toFixed(1)}%`       : '—',
            dataYear: year, source: 'World Bank API',
          });
        } else {
          result.push({ name:c.country, capital:c.capital, continent:c.continent, sustainability:0, co2:'—', renewable:'—', gdp:'—', population:'—', forest:'—', dataYear:null, source:'N/A' });
        }
      } catch {
        result.push({ name:c.country, capital:c.capital, continent:c.continent, sustainability:0, co2:'—', renewable:'—', gdp:'—', population:'—', forest:'—', dataYear:null, source:'N/A' });
      }
      setProgress(Math.round(((i + 1) / batch.length) * 100));
      // pequena pausa para não sobrecarregar a API
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 200));
    }

    setRows(result);
    setDataReady(true);
    setFetching(false);
  };

  const download = (content: string, mime: string, ext: string) => {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `GaiaMind_WorldBank_${new Date().toISOString().split('T')[0]}.${ext}`;
    document.body.appendChild(a); a.click();
    if (document.body.contains(a)) document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDone(t('map.report_exported', { format: ext.toUpperCase() }));
  };

  const generate = async (format: 'html' | 'csv' | 'json' | 'txt') => {
    if (loading || fetching) return;
    setLoading(true);
    setDone(null);

    const data = rows.length > 0 ? rows : REPORT_COUNTRIES.map(c => ({
      name: c.country,
      capital: c.capital,
      continent: c.continent,
      sustainability: 0,
      co2: '—',
      renewable: '—',
      gdp: '—',
      population: '—',
      forest: '—',
      dataYear: null,
      source: '—',
    }));

    const reportTitle = t('map.export_title');
    const reportGenerated = t('map.report_generated');
    const reportSource = t('map.report_source');
    const reportRole = t('map.report_role');
    const reportRealtime = t('map.report_real_time');
    const reportFooter = t('map.report_footer');
    const reportCountriesWithData = t('map.report_countries_with_data', { count: data.filter(r => r.sustainability > 0).length, total: data.length });

    const meta = `${reportTitle}\n${reportGenerated}: ${new Date().toLocaleString()}\n${reportSource}: World Bank API (${reportRealtime})\n${reportRole}: ${role}\n`;

    if (format === 'csv') {
      const header = [
        t('map.country'),
        t('map.capital'),
        t('map.continent'),
        t('map.sustainability_indicator'),
        t('map.co2'),
        t('map.renewable'),
        t('map.gdp'),
        t('map.population'),
        t('map.forest'),
        t('map.report_year'),
        t('map.source'),
      ];
      const csvRows = data.map(r => [
        r.name,
        r.capital,
        r.continent,
        r.sustainability > 0 ? `${r.sustainability}%` : '—',
        r.co2,
        r.renewable,
        r.gdp,
        r.population,
        r.forest,
        r.dataYear || '—',
        r.source,
      ]);
      download([
        header,
        ...csvRows,
      ].map(row => row.map(v => `"${v}"`).join(',')).join('\n'), 'text/csv', 'csv');

    } else if (format === 'json') {
      download(JSON.stringify({
        generated: new Date().toISOString(),
        source: 'World Bank API',
        role,
        total_countries: data.length,
        countries: data,
      }, null, 2), 'application/json', 'json');

    } else if (format === 'txt') {
      const lines = [
        meta,
        '='.repeat(60),
        '',
        ...data.map(r => `${r.name.padEnd(30)} ${r.continent.padEnd(20)} Sust:${r.sustainability > 0 ? r.sustainability + '%' : '—'.padStart(4)} CO₂:${r.co2.padStart(12)} Renov:${r.renewable.padStart(7)}`),
      ];
      download(lines.join('\n'), 'text/plain', 'txt');

    } else {
      const sustainColor = (s: number) => s >= 60 ? '#22c55e' : s >= 40 ? '#eab308' : s > 0 ? '#ef4444' : '#6b7280';
      const html = `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8">
<title>${reportTitle}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:#001F3F;color:#fff;padding:32px}
  h1{color:#00FFCC;font-size:1.5rem;margin-bottom:0.5rem}
  .meta{font-size:0.8rem;color:rgba(255,255,255,0.5);margin-bottom:1.5rem;display:flex;gap:1rem;flex-wrap:wrap}
  .badge{padding:0.2rem 0.6rem;border-radius:4px;font-size:0.72rem;font-weight:600;background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3)}
  table{width:100%;border-collapse:collapse;font-size:0.82rem}
  th{background:rgba(0,255,204,0.1);color:#00FFCC;padding:10px 12px;text-align:left;border-bottom:2px solid rgba(0,255,204,0.2)}
  td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06)}
  tr:hover td{background:rgba(255,255,255,0.03)}
  .na{color:rgba(255,255,255,0.25)}
  footer{margin-top:2rem;font-size:0.72rem;color:rgba(255,255,255,0.3);text-align:center}
</style></head><body>
<h1>🌍 GaiaMind — ${reportTitle}</h1>
<div class="meta">
  <span>${reportGenerated}: ${new Date().toLocaleString()}</span>
  <span class="badge">✓ World Bank API</span>
  <span class="badge">${reportRealtime}</span>
  <span>${reportCountriesWithData}</span>
</div>
<table>
<thead><tr><th>${t('map.country')}</th><th>${t('map.capital')}</th><th>${t('map.continent')}</th><th>${t('map.sustainability_indicator')}</th><th>${t('map.co2')}</th><th>${t('map.renewable')}</th><th>${t('map.gdp')}</th><th>${t('map.report_year')}</th></tr></thead>
<tbody>
${data.map(r => `<tr>
  <td><strong>${r.name}</strong></td>
  <td>${r.capital}</td>
  <td>${r.continent}</td>
  <td style="color:${sustainColor(r.sustainability)};font-weight:600">${r.sustainability > 0 ? r.sustainability + '%' : '<span class=na>—</span>'}</td>
  <td>${r.co2 === '—' ? '<span class=na>—</span>' : r.co2}</td>
  <td>${r.renewable === '—' ? '<span class=na>—</span>' : r.renewable}</td>
  <td>${r.gdp === '—' ? '<span class=na>—</span>' : r.gdp}</td>
  <td class="na">${r.dataYear || '—'}</td>
</tr>`).join('')}
</tbody></table>
<footer>${reportFooter}</footer>
</body></html>`;
      download(html, 'text/html', 'html');
    }
    setLoading(false);
  };

  const FORMATS = [
    { format: 'html' as const, icon: '🌐', label: t('map.format.html.label'),    desc: t('map.format.html.desc'), color: '#3b82f6' },
    { format: 'csv'  as const, icon: '📊', label: t('map.format.csv.label'),     desc: t('map.format.csv.desc'),  color: '#22c55e' },
    { format: 'json' as const, icon: '⚙️', label: t('map.format.json.label'),    desc: t('map.format.json.desc'), color: '#a855f7' },
    { format: 'txt'  as const, icon: '📝', label: t('map.format.txt.label'),     desc: t('map.format.txt.desc'),  color: '#eab308' },
  ];

  // ── Acesso negado ──
  if (!canAccess) {
    return (
      <PageShell title={t('map.export_title')} subtitle={t('map.export_restricted')} onClose={onClose} onNavigate={onNavigate} currentPage={currentPage}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem 2rem', gap:'1rem', textAlign:'center' }}>
          <Lock style={{ width:'3rem', height:'3rem', color:'#f87171' }} />
          <h3 style={{ color:'#E0F7FA', fontSize:'1.1rem', fontWeight:700 }}>{t('map.export_access_restricted_title')}</h3>
          <p style={{ color:'rgba(224,247,250,0.5)', fontSize:'0.875rem', maxWidth:'320px' }}>
            {t('map.export_access_restricted_desc')} <strong style={{ color:'#fbbf24' }}>Analyst</strong> {t('map.and')} <strong style={{ color:'#f59e0b' }}>Owner</strong>.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={t('map.export_title')} subtitle={t('map.export_subtitle')} onClose={onClose} onNavigate={onNavigate} currentPage={currentPage}>

      {/* Status de carregamento */}
      {fetching && (
        <div style={{ marginBottom:'1rem', padding:'0.75rem 1rem', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem' }}>
            <span style={{ fontSize:'0.8rem', color:'#60a5fa' }}>{t('map.loading_export_data')}</span>
            <span style={{ fontSize:'0.8rem', color:'#60a5fa', fontWeight:600 }}>{progress}%</span>
          </div>
          <div style={{ height:'4px', background:'rgba(255,255,255,0.1)', borderRadius:'2px', overflow:'hidden' }}>
            <div style={{ width:`${progress}%`, height:'100%', background:'#3b82f6', borderRadius:'2px', transition:'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {dataReady && !fetching && (
        <div style={{ marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#4ade80', animation:'h2-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize:'0.78rem', color:'#4ade80', fontWeight:600 }}>{t('map.world_bank')}</span>
          <span style={{ fontSize:'0.78rem', color:'rgba(224,247,250,0.5)' }}>{t('map.world_bank_realtime')}</span>
          <span style={{ fontSize:'0.78rem', color:'rgba(224,247,250,0.5)' }}>{t('map.countries_with_data', { count: rows.filter(r=>r.sustainability>0).length, total: rows.length })}</span>
          <button onClick={fetchData} style={{ marginLeft:'auto', fontSize:'0.7rem', padding:'0.2rem 0.5rem', background:'rgba(0,230,118,0.08)', border:'1px solid rgba(0,230,118,0.2)', borderRadius:'4px', color:'#00E676', cursor:'pointer' }}>
            🔄 {t('map.refresh')}
          </button>
        </div>
      )}

      {done && (
        <div style={{ marginBottom:'1rem', padding:'0.75rem 1rem', background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'8px', color:'#4ade80', fontSize:'0.875rem', textAlign:'center' }}>
          {done}
        </div>
      )}

      {/* Formatos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {FORMATS.map(f => (
          <button key={f.format} onClick={() => generate(f.format)} disabled={loading || fetching}
            className="card-base"
            style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:'0.75rem', padding:'1rem', textAlign:'left', borderColor:`${f.color}30`, opacity: (loading||fetching) ? 0.6 : 1 }}>
            <span style={{ fontSize:'1.75rem', flexShrink:0 }}>{f.icon}</span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#E0F7FA', marginBottom:'0.15rem' }}>{f.label}</div>
              <div style={{ fontSize:'0.68rem', color:'rgba(224,247,250,0.45)' }}>{f.desc}</div>
            </div>
            <Download style={{ width:'14px', height:'14px', color:f.color, flexShrink:0, marginLeft:'auto' }} />
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="insights-card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem', flexWrap:'wrap', gap:'0.5rem' }}>
          <h3 className="insights-card-title" style={{ margin:0 }}>📋 {t('map.preview_title')}</h3>
          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background: dataReady ? '#4ade80' : '#6b7280', animation: dataReady ? 'h2-pulse 2s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize:'0.68rem', color: dataReady ? '#4ade80' : 'rgba(224,247,250,0.3)' }}>
              {dataReady ? t('map.world_bank_realtime') : fetching ? t('map.loading') : t('map.wait_loading')}
            </span>
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.75rem', minWidth:'500px' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(0,230,118,0.15)' }}>
                {[
                  t('map.country'),
                  t('map.capital'),
                  t('map.continent'),
                  t('map.sustainability_indicator'),
                  t('map.co2'),
                  t('map.renewable'),
                  t('map.gdp'),
                  t('map.report_year'),
                ].map(h => (
                  <th key={h} style={{ padding:'0.4rem 0.6rem', textAlign:'left', color:'#00E676', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows.length > 0 ? rows : REPORT_COUNTRIES.map(c => ({ name:c.country, capital:c.capital, continent:c.continent, sustainability:0, co2:'—', renewable:'—', gdp:'—', population:'—', forest:'—', dataYear:null, source:'—' }))).slice(0, 8).map(r => (
                <tr key={r.name} style={{ borderBottom:'1px solid rgba(0,230,118,0.05)' }}>
                  <td style={{ padding:'0.4rem 0.6rem', color:'#E0F7FA', fontWeight:500 }}>{r.name}</td>
                  <td style={{ padding:'0.4rem 0.6rem', color:'rgba(224,247,250,0.55)' }}>{r.capital}</td>
                  <td style={{ padding:'0.4rem 0.6rem', color:'rgba(224,247,250,0.55)' }}>{r.continent}</td>
                  <td style={{ padding:'0.4rem 0.6rem', fontWeight:600, color: r.sustainability>=60?'#4ade80':r.sustainability>=40?'#eab308':r.sustainability>0?'#f87171':'rgba(224,247,250,0.25)' }}>
                    {r.sustainability > 0 ? `${r.sustainability}%` : '—'}
                  </td>
                  <td style={{ padding:'0.4rem 0.6rem', color: r.co2==='—'?'rgba(224,247,250,0.25)':'rgba(224,247,250,0.7)' }}>{r.co2}</td>
                  <td style={{ padding:'0.4rem 0.6rem', color: r.renewable==='—'?'rgba(224,247,250,0.25)':'rgba(224,247,250,0.7)' }}>{r.renewable}</td>
                  <td style={{ padding:'0.4rem 0.6rem', color: r.gdp==='—'?'rgba(224,247,250,0.25)':'rgba(224,247,250,0.7)' }}>{r.gdp}</td>
                  <td style={{ padding:'0.4rem 0.6rem', color:'rgba(224,247,250,0.3)', fontSize:'0.65rem' }}>{r.dataYear || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize:'0.65rem', color:'rgba(224,247,250,0.25)', marginTop:'0.5rem', textAlign:'center' }}>
            {t('map.export_preview_summary', { count: 8, total: REPORT_COUNTRIES.length })}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
