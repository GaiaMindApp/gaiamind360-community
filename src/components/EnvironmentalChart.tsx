import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { year: '2015', co2: 400, temp: 0.9, renewable: 18 },
  { year: '2017', co2: 406, temp: 0.95, renewable: 21 },
  { year: '2019', co2: 412, temp: 1.05, renewable: 24 },
  { year: '2021', co2: 416, temp: 1.15, renewable: 26 },
  { year: '2023', co2: 419, temp: 1.2, renewable: 28 },
  { year: '2025', co2: 421, temp: 1.25, renewable: 29 },
];

export function EnvironmentalChart() {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <XAxis 
          dataKey="year" 
          stroke="#E0F7FA"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#E0F7FA"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#003049', 
            border: '1px solid #00E676',
            borderRadius: '8px',
            color: '#E0F7FA'
          }}
        />
        <Legend 
          wrapperStyle={{ color: '#E0F7FA' }}
        />
        <Line 
          type="monotone" 
          dataKey="co2" 
          stroke="#FFD54F" 
          strokeWidth={1.5}
          name="CO₂ (ppm)"
          dot={{ fill: '#FFD54F', r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="temp" 
          stroke="#FF6B6B" 
          strokeWidth={1.5}
          name="Temp (°C)"
          dot={{ fill: '#FF6B6B', r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="renewable" 
          stroke="#00E676" 
          strokeWidth={1.5}
          name="Renovável (%)"
          dot={{ fill: '#00E676', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
