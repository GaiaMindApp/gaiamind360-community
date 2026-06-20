export interface LatinAmericaCountry {
  country: string;
  capital: string;
  latitude: number;
  longitude: number;
}

export const latinAmericaData: LatinAmericaCountry[] = [
  { country: 'Argentina', capital: 'Buenos Aires', latitude: -34.6, longitude: -58.4 },
  { country: 'Bolívia', capital: 'Sucre/La Paz', latitude: -16.5, longitude: -68.1 },
  { country: 'Brasil', capital: 'Brasília', latitude: -15.8, longitude: -47.9 },
  { country: 'Chile', capital: 'Santiago', latitude: -33.4, longitude: -70.7 },
  { country: 'Colômbia', capital: 'Bogotá', latitude: 4.6, longitude: -74.1 },
  { country: 'Equador', capital: 'Quito', latitude: -0.2, longitude: -78.5 },
  { country: 'Paraguai', capital: 'Assunção', latitude: -25.3, longitude: -57.6 },
  { country: 'Peru', capital: 'Lima', latitude: -12.0, longitude: -77.0 },
  { country: 'Uruguai', capital: 'Montevidéu', latitude: -34.9, longitude: -56.2 },
  { country: 'Venezuela', capital: 'Caracas', latitude: 10.5, longitude: -66.9 },
  { country: 'Costa Rica', capital: 'San José', latitude: 9.9, longitude: -84.1 },
  { country: 'Cuba', capital: 'Havana', latitude: 23.1, longitude: -82.4 },
  { country: 'El Salvador', capital: 'San Salvador', latitude: 13.7, longitude: -89.2 },
  { country: 'Guatemala', capital: 'Cidade da Guatemala', latitude: 14.6, longitude: -90.5 },
  { country: 'Haiti', capital: 'Porto Príncipe', latitude: 18.5, longitude: -72.3 },
  { country: 'Honduras', capital: 'Tegucigalpa', latitude: 14.1, longitude: -87.2 },
  { country: 'México', capital: 'Cidade do México', latitude: 19.4, longitude: -99.1 },
  { country: 'Nicarágua', capital: 'Manágua', latitude: 12.1, longitude: -86.2 },
  { country: 'Panamá', capital: 'Cidade do Panamá', latitude: 9.0, longitude: -79.5 },
  { country: 'República Dominicana', capital: 'Santo Domingo', latitude: 18.5, longitude: -69.9 }
];