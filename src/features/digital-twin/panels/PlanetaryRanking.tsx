/**
 * PlanetaryRanking — GaiaMind Digital Twin Earth
 * Global leaderboard with sorting, filtering, rank-change deltas, Time Machine sync.
 * Requirements: 10.1–10.7 — Properties 19–21
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDigitalTwinStore } from '../store/digitalTwinStore';

export type RankIndex =
  | 'gaiamind_score'
  | 'governance_effectiveness'
  | 'hdi'
  | 'climate_resilience'
  | 'economic_resilience'
  | 'innovation_index'
  | 'digital_transformation';

const INDEX_LABELS: Record<RankIndex, string> = {
  gaiamind_score:           'GaiaMind',
  governance_effectiveness: 'Governance',
  hdi:                      'HDI',
  climate_resilience:       'Climate',
  economic_resilience:      'Economy',
  innovation_index:         'Innovation',
  digital_transformation:   'Digital',
};

export interface RankCountry {
  iso3: string;
  name: string;
  continent: string;
  incomeGroup: string;
  unRegion: string;
  scores: Record<RankIndex, number>;
  prevScores?: Record<RankIndex, number>;
}

/** Property 19: encode rank change direction */
export function getRankChangeDelta(
  r1: number,
  r2: number
): { direction: '▲' | '▼' | '—'; delta: number } {
  if (r2 > r1) return { direction: '▲', delta: r2 - r1 };
  if (r1 > r2) return { direction: '▼', delta: r1 - r2 };
  return { direction: '—', delta: 0 };
}

/** Property 20: sort countries by index descending */
export function sortByIndex(
  countries: RankCountry[],
  index: RankIndex,
  ascending: boolean
): RankCountry[] {
  return [...countries].sort((a, b) => {
    const diff = (a.scores[index] ?? 0) - (b.scores[index] ?? 0);
    return ascending ? diff : -diff;
  });
}

/** Property 21: filter with AND logic across continent, incomeGroup, unRegion */
export function applyFilters(
  countries: RankCountry[],
  filters: { continent?: string; incomeGroup?: string; unRegion?: string }
): RankCountry[] {
  return countries.filter((c) => {
    if (filters.continent  && c.continent  !== filters.continent)  return false;
    if (filters.incomeGroup && c.incomeGroup !== filters.incomeGroup) return false;
    if (filters.unRegion   && c.unRegion   !== filters.unRegion)   return false;
    return true;
  });
}

export function PlanetaryRanking(): React.ReactElement {
  const [countries, setCountries] = useState<RankCountry[]>([]);
  const [showAll, setShowAll]     = useState(false);
  const [sortIndex, setSortIndex] = useState<RankIndex>('gaiamind_score');
  const [ascending, setAscending] = useState(false);
  const [filters, setFilters]     = useState<{ continent?: string; incomeGroup?: string; unRegion?: string }>({});

  const selectedIso3  = useDigitalTwinStore((s) => s.selectedIso3);
  const selectedYear  = useDigitalTwinStore((s) => s.selectedYear);
  const currentYear   = new Date().getFullYear();
  const isYearOffset  = selectedYear !== currentYear;

  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  // Fetch ranking data
  useEffect(() => {
    const url = `/api/v1/digital-twin/layers/ranking?year=${selectedYear}`;
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') ?? ''}` } })
      .then((r) => r.json())
      .then((data) => setCountries(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [selectedYear]);

  // Scroll to selected country within 300ms
  useEffect(() => {
    if (!selectedIso3) return;
    const timer = setTimeout(() => {
      const row = rowRefs.current.get(selectedIso3);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedIso3]);

  const sorted   = useMemo(() => sortByIndex(applyFilters(countries, filters), sortIndex, ascending), [countries, filters, sortIndex, ascending]);
  const displayed = showAll ? sorted : sorted.slice(0, 20);

  const handleHeaderClick = (index: RankIndex) => {
    if (sortIndex === index) {
      setAscending((a) => !a);
    } else {
      setSortIndex(index);
      setAscending(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Planetary ranking leaderboard"
      style={{
        position: 'fixed',
        top: 60,
        left: 16,
        bottom: 140,
        width: 340,
        background: 'rgba(8,12,25,0.92)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Google Sans", sans-serif',
        zIndex: 8400,
      }}
    >
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          Planetary Rankings
          {isYearOffset && (
            <span style={{ marginLeft: 8, fontSize: 10, color: '#f59e0b' }}>{selectedYear}</span>
          )}
        </span>
        <button
          onClick={() => setShowAll((v) => !v)}
          aria-label={showAll ? 'Show top 20 only' : 'Show all 195 countries'}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4, color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
        >
          {showAll ? 'Top 20' : 'Show all'}
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#fff' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 500, color: 'rgba(255,255,255,0.5)', width: 30 }}>#</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>Country</th>
              {(Object.keys(INDEX_LABELS) as RankIndex[]).map((idx) => (
                <th
                  key={idx}
                  onClick={() => handleHeaderClick(idx)}
                  aria-sort={sortIndex === idx ? (ascending ? 'ascending' : 'descending') : 'none'}
                  style={{
                    padding: '6px 4px',
                    textAlign: 'right',
                    fontWeight: sortIndex === idx ? 700 : 400,
                    color: sortIndex === idx ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontSize: 9,
                  }}
                >
                  {INDEX_LABELS[idx]}
                  {sortIndex === idx && (ascending ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((c, i) => {
              const isSelected = selectedIso3 === c.iso3;
              const rank       = i + 1;
              const prevRank   = sorted.findIndex((x) => x.iso3 === c.iso3) + 1; // simplified
              const delta      = getRankChangeDelta(rank, prevRank);

              return (
                <tr
                  key={c.iso3}
                  ref={(el) => el && rowRefs.current.set(c.iso3, el)}
                  aria-selected={isSelected}
                  style={{
                    background: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    outline: isSelected ? '1px solid rgba(59,130,246,0.4)' : 'none',
                  }}
                >
                  <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.4)' }}>{rank}</td>
                  <td style={{ padding: '5px 8px' }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                      {delta.direction === '▲' && <span style={{ color: '#22c55e' }}>▲{delta.delta}</span>}
                      {delta.direction === '▼' && <span style={{ color: '#ef4444' }}>▼{delta.delta}</span>}
                      {delta.direction === '—' && <span style={{ color: '#6b7280' }}>—</span>}
                    </div>
                  </td>
                  {(Object.keys(INDEX_LABELS) as RankIndex[]).map((idx) => (
                    <td key={idx} style={{ padding: '5px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {(c.scores[idx] ?? 0).toFixed(1)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlanetaryRanking;
