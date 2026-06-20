import { useMemo } from 'react';
import * as THREE from 'three';
import { worldData } from '../../data/worldData';

interface CountryLayerProps {
  visible: boolean;
  onCountryClick: (country: any) => void;
}

export function CountryLayer({ visible, onCountryClick }: CountryLayerProps) {
  const countryMeshes = useMemo(() => {
    if (!visible) return [];
    
    return worldData.flatMap(continent =>
      continent.countries.flatMap(country =>
        country.locations.map((location, index) => {
          const lat = location.lat * Math.PI / 180;
          const lon = location.lon * Math.PI / 180;
          
          const x = 2.005 * Math.cos(lat) * Math.cos(lon);
          const y = 2.005 * Math.sin(lat);
          const z = 2.005 * Math.cos(lat) * Math.sin(lon);

          const getColor = () => {
            switch (location.type) {
              case 'capital': return '#ff4444';
              case 'city': return '#44aaff';
              case 'province': return '#44ff44';
              case 'village': return '#ffaa44';
              default: return '#ffffff';
            }
          };

          const getSize = () => {
            switch (location.type) {
              case 'capital': return 0.015;
              case 'city': return 0.01;
              case 'province': return 0.008;
              case 'village': return 0.005;
              default: return 0.008;
            }
          };

          return {
            key: `${country.code}-${index}`,
            position: [x, y, z] as [number, number, number],
            color: getColor(),
            size: getSize(),
            data: { location, country }
          };
        })
      )
    );
  }, [visible]);

  if (!visible) return null;

  return (
    <group>
      {countryMeshes.map(({ key, position, color, size, data }) => (
        <mesh
          key={key}
          position={position}
          onClick={(e) => {
            e.stopPropagation();
            onCountryClick(data);
          }}
        >
          <sphereGeometry args={[size, 8, 8]} />
          <meshBasicMaterial 
            color={color}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}