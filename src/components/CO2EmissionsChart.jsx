import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause } from 'lucide-react';
import { authFetch } from '../services/authFetch';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const CO2EmissionsChart = () => {
  const [allData, setAllData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [currentSnapshot, setCurrentSnapshot] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentYear, setCurrentYear] = useState(2024);
  const [minYear, setMinYear] = useState(1750);
  const maxYear = allData.length ? allData[allData.length - 1].year : 2024;

  useEffect(() => {
    authFetch(`${API}/co2-emissions/chart-data`)
      .then(res => res.json())
      .then(result => {
        console.log('API Response:', result);
        
        if (result.chart_data && Object.keys(result.chart_data).length > 0) {
          const allYears = new Set();
          Object.values(result.chart_data).forEach(countryData => {
            countryData.years.forEach(year => allYears.add(year));
          });
          
          const sortedYears = Array.from(allYears).sort((a, b) => a - b);
          const firstYear = sortedYears[0] ?? 1750;
          
          const chartData = sortedYears.map(year => {
            const dataPoint = { year };
            Object.entries(result.chart_data).forEach(([country, countryData]) => {
              const yearIndex = countryData.years.indexOf(year);
              dataPoint[country] = yearIndex !== -1 ? countryData.emissions[yearIndex] : null;
            });
            return dataPoint;
          });
          
          setAllData(chartData);
          setDisplayData(chartData);
          setMinYear(firstYear);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying && currentYear < maxYear) {
      interval = setInterval(() => {
        setCurrentYear(prev => {
          const next = prev + 1;
          if (next >= maxYear) {
            setIsPlaying(false);
            return maxYear;
          }
          return next;
        });
      }, 80); // Velocidade média-alta
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentYear, maxYear]);

  useEffect(() => {
    const data = allData.filter(d => d.year <= currentYear);
    setDisplayData(data);
    setCurrentSnapshot(data[data.length - 1] || {});
  }, [currentYear, allData]);

  const togglePlay = () => {
    const shouldRestart = currentYear >= maxYear || currentYear < minYear;
    if (shouldRestart) {
      // Reset primeiro, depois o useEffect do intervalo vai arrancar com o novo currentYear
      setCurrentYear(minYear);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    // Lê o tamanho inicial imediatamente
    setContainerWidth(containerRef.current.getBoundingClientRect().width || 800);
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setContainerWidth(e.contentRect.width || 800);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (!allData.length) return <div>Sem dados</div>;

  return (
    <div ref={containerRef} style={{ width: '100%', minHeight: '500px', background: 'linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%)', padding: '20px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a2637' }}><strong>CO₂ emissions per capita</strong></h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#00c884' }}>{currentYear}</span>
            <button
              onClick={togglePlay}
              style={{
                background: '#00c884',
                color: '#1a2637',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(0,200,132,0.2)'
              }}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
          {['World', 'United States', 'China', 'European Union (27)'].map(key => (
            <div key={key} style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.85)', color: '#1a2637', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#5a6b7f' }}>{key}</div>
              <div style={{ marginTop: '6px', fontSize: '1rem', fontWeight: 700 }}>{currentSnapshot[key] != null ? Number(currentSnapshot[key]).toFixed(2) : '—'}</div>
              <div style={{ fontSize: '0.72rem', color: '#6f7d8c', marginTop: '4px' }}>t per capita</div>
            </div>
          ))}
        </div>
      </div>

      {containerWidth > 0 ? (
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: '#5a6b7f' }}
              type="number"
              scale="linear"
              domain={[minYear, maxYear]}
              tickCount={8}
              stroke="#d0d8e0"
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#5a6b7f' }}
              label={{ value: 't', angle: 0, position: 'insideTopLeft', fill: '#5a6b7f' }}
              domain={[0, 25]}
              stroke="#d0d8e0"
            />
            <Tooltip
              cursor={false}
              formatter={(value, name) => [`${Number(value).toFixed(1)} t`, name]}
              labelFormatter={(label) => `${label}`}
              contentStyle={{ background: 'rgba(240, 244, 248, 0.98)', border: '1px solid rgba(100,150,200,0.3)', borderRadius: '6px', color: '#1a2637' }}
            />
            <Line type="monotone" dataKey="United States" stroke="#00FF85" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="Canada" stroke="#4FC3F7" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="China" stroke="#FFD54F" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="South Africa" stroke="#FF7043" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="European Union (27)" stroke="#ee6666" strokeWidth={1.25} dot={false} />
            <Line type="monotone" dataKey="World" stroke="#73c0de" strokeWidth={1.25} dot={false} />
            <Line type="monotone" dataKey="United Kingdom" stroke="#3ba272" strokeWidth={1.25} dot={false} />
            <Line type="monotone" dataKey="India" stroke="#9a60b4" strokeWidth={1.25} dot={false} />
            <Line type="monotone" dataKey="Kenya" stroke="#ea7ccc" strokeWidth={1.25} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 380 }} />
      )}
    </div>
  );
};

export default CO2EmissionsChart;