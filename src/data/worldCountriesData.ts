export interface WorldCountry {
  country: string;
  capital: string;
  latitude: number;
  longitude: number;
  continent: string;
  population?: number;
  area?: number;
}

export const worldCountriesData: WorldCountry[] = [
  // América do Norte
  { country: 'Estados Unidos', capital: 'Washington D.C.', latitude: 38.9072, longitude: -77.0369, continent: 'América do Norte', population: 331002651, area: 9833517 },
  { country: 'Canadá', capital: 'Ottawa', latitude: 45.4215, longitude: -75.6972, continent: 'América do Norte', population: 38000000, area: 9984670 },
  { country: 'México', capital: 'Cidade do México', latitude: 19.4326, longitude: -99.1332, continent: 'América do Norte', population: 128932753, area: 1964375 },
  
  // América Central e Caribe
  { country: 'Guatemala', capital: 'Cidade da Guatemala', latitude: 14.6349, longitude: -90.5069, continent: 'América Central', population: 17915568, area: 108889 },
  { country: 'Belize', capital: 'Belmopan', latitude: 17.2510, longitude: -88.7590, continent: 'América Central', population: 397628, area: 22966 },
  { country: 'El Salvador', capital: 'San Salvador', latitude: 13.6929, longitude: -89.2182, continent: 'América Central', population: 6486205, area: 21041 },
  { country: 'Honduras', capital: 'Tegucigalpa', latitude: 14.0723, longitude: -87.1921, continent: 'América Central', population: 9904607, area: 112492 },
  { country: 'Nicarágua', capital: 'Manágua', latitude: 12.1364, longitude: -86.2514, continent: 'América Central', population: 6624554, area: 130373 },
  { country: 'Costa Rica', capital: 'San José', latitude: 9.9281, longitude: -84.0907, continent: 'América Central', population: 5094118, area: 51100 },
  { country: 'Panamá', capital: 'Cidade do Panamá', latitude: 8.9824, longitude: -79.5199, continent: 'América Central', population: 4314767, area: 75417 },
  { country: 'Cuba', capital: 'Havana', latitude: 23.1136, longitude: -82.3666, continent: 'Caribe', population: 11326616, area: 109884 },
  { country: 'Jamaica', capital: 'Kingston', latitude: 17.9712, longitude: -76.7936, continent: 'Caribe', population: 2961167, area: 10991 },
  { country: 'Haiti', capital: 'Porto Príncipe', latitude: 18.5944, longitude: -72.3074, continent: 'Caribe', population: 11402528, area: 27750 },
  { country: 'República Dominicana', capital: 'Santo Domingo', latitude: 18.4861, longitude: -69.9312, continent: 'Caribe', population: 10847910, area: 48671 },
  
  // América do Sul
  { country: 'Brasil', capital: 'Brasília', latitude: -15.8267, longitude: -47.9218, continent: 'América do Sul', population: 215313498, area: 8514877 },
  { country: 'Argentina', capital: 'Buenos Aires', latitude: -34.6118, longitude: -58.3960, continent: 'América do Sul', population: 45195774, area: 2780400 },
  { country: 'Chile', capital: 'Santiago', latitude: -33.4489, longitude: -70.6693, continent: 'América do Sul', population: 19116201, area: 756096 },
  { country: 'Peru', capital: 'Lima', latitude: -12.0464, longitude: -77.0428, continent: 'América do Sul', population: 32971854, area: 1285216 },
  { country: 'Colômbia', capital: 'Bogotá', latitude: 4.7110, longitude: -74.0721, continent: 'América do Sul', population: 50882891, area: 1141748 },
  { country: 'Venezuela', capital: 'Caracas', latitude: 10.4806, longitude: -66.9036, continent: 'América do Sul', population: 28435940, area: 912050 },
  { country: 'Equador', capital: 'Quito', latitude: -0.1807, longitude: -78.4678, continent: 'América do Sul', population: 17643054, area: 283561 },
  { country: 'Bolívia', capital: 'Sucre', latitude: -19.0196, longitude: -65.2619, continent: 'América do Sul', population: 11673021, area: 1098581 },
  { country: 'Paraguai', capital: 'Assunção', latitude: -25.2637, longitude: -57.5759, continent: 'América do Sul', population: 7132538, area: 406752 },
  { country: 'Uruguai', capital: 'Montevidéu', latitude: -34.9011, longitude: -56.1645, continent: 'América do Sul', population: 3473730, area: 176215 },
  { country: 'Guiana', capital: 'Georgetown', latitude: 6.8013, longitude: -58.1551, continent: 'América do Sul', population: 786552, area: 214969 },
  { country: 'Suriname', capital: 'Paramaribo', latitude: 5.8520, longitude: -55.2038, continent: 'América do Sul', population: 586632, area: 163820 },
  
  // Europa
  { country: 'Reino Unido', capital: 'Londres', latitude: 51.5074, longitude: -0.1278, continent: 'Europa', population: 67886011, area: 243610 },
  { country: 'França', capital: 'Paris', latitude: 48.8566, longitude: 2.3522, continent: 'Europa', population: 65273511, area: 643801 },
  { country: 'Alemanha', capital: 'Berlim', latitude: 52.5200, longitude: 13.4050, continent: 'Europa', population: 83783942, area: 357114 },
  { country: 'Itália', capital: 'Roma', latitude: 41.9028, longitude: 12.4964, continent: 'Europa', population: 60461826, area: 301340 },
  { country: 'Espanha', capital: 'Madrid', latitude: 40.4168, longitude: -3.7038, continent: 'Europa', population: 46754778, area: 505370 },
  { country: 'Portugal', capital: 'Lisboa', latitude: 38.7223, longitude: -9.1393, continent: 'Europa', population: 10196709, area: 92090 },
  { country: 'Holanda', capital: 'Amsterdã', latitude: 52.3676, longitude: 4.9041, continent: 'Europa', population: 17134872, area: 41543 },
  { country: 'Bélgica', capital: 'Bruxelas', latitude: 50.8503, longitude: 4.3517, continent: 'Europa', population: 11589623, area: 30528 },
  { country: 'Suíça', capital: 'Berna', latitude: 46.9480, longitude: 7.4474, continent: 'Europa', population: 8654622, area: 41285 },
  { country: 'Áustria', capital: 'Viena', latitude: 48.2082, longitude: 16.3738, continent: 'Europa', population: 9006398, area: 83871 },
  { country: 'Suécia', capital: 'Estocolmo', latitude: 59.3293, longitude: 18.0686, continent: 'Europa', population: 10099265, area: 450295 },
  { country: 'Noruega', capital: 'Oslo', latitude: 59.9139, longitude: 10.7522, continent: 'Europa', population: 5421241, area: 323802 },
  { country: 'Dinamarca', capital: 'Copenhague', latitude: 55.6761, longitude: 12.5683, continent: 'Europa', population: 5792202, area: 43094 },
  { country: 'Finlândia', capital: 'Helsinque', latitude: 60.1699, longitude: 24.9384, continent: 'Europa', population: 5540720, area: 338424 },
  { country: 'Polônia', capital: 'Varsóvia', latitude: 52.2297, longitude: 21.0122, continent: 'Europa', population: 37846611, area: 312696 },
  { country: 'República Tcheca', capital: 'Praga', latitude: 50.0755, longitude: 14.4378, continent: 'Europa', population: 10708981, area: 78867 },
  { country: 'Hungria', capital: 'Budapeste', latitude: 47.4979, longitude: 19.0402, continent: 'Europa', population: 9660351, area: 93028 },
  { country: 'Grécia', capital: 'Atenas', latitude: 37.9838, longitude: 23.7275, continent: 'Europa', population: 10423054, area: 131957 },
  { country: 'Rússia', capital: 'Moscou', latitude: 55.7558, longitude: 37.6176, continent: 'Europa/Ásia', population: 145934462, area: 17098242 },
  
  // Ásia
  { country: 'China', capital: 'Pequim', latitude: 39.9042, longitude: 116.4074, continent: 'Ásia', population: 1439323776, area: 9596961 },
  { country: 'Índia', capital: 'Nova Delhi', latitude: 28.6139, longitude: 77.2090, continent: 'Ásia', population: 1380004385, area: 3287263 },
  { country: 'Japão', capital: 'Tóquio', latitude: 35.6762, longitude: 139.6503, continent: 'Ásia', population: 125836021, area: 377930 },
  { country: 'Coreia do Sul', capital: 'Seul', latitude: 37.5665, longitude: 126.9780, continent: 'Ásia', population: 51269185, area: 100210 },
  { country: 'Coreia do Norte', capital: 'Pyongyang', latitude: 39.0392, longitude: 125.7625, continent: 'Ásia', population: 25778816, area: 120538 },
  { country: 'Tailândia', capital: 'Bangkok', latitude: 13.7563, longitude: 100.5018, continent: 'Ásia', population: 69799978, area: 513120 },
  { country: 'Vietnã', capital: 'Hanói', latitude: 21.0285, longitude: 105.8542, continent: 'Ásia', population: 97338579, area: 331212 },
  { country: 'Indonésia', capital: 'Jacarta', latitude: -6.2088, longitude: 106.8456, continent: 'Ásia', population: 273523615, area: 1904569 },
  { country: 'Malásia', capital: 'Kuala Lumpur', latitude: 3.1390, longitude: 101.6869, continent: 'Ásia', population: 32365999, area: 329847 },
  { country: 'Singapura', capital: 'Singapura', latitude: 1.3521, longitude: 103.8198, continent: 'Ásia', population: 5850342, area: 719 },
  { country: 'Filipinas', capital: 'Manila', latitude: 14.5995, longitude: 120.9842, continent: 'Ásia', population: 109581078, area: 300000 },
  { country: 'Paquistão', capital: 'Islamabad', latitude: 33.7294, longitude: 73.0931, continent: 'Ásia', population: 220892340, area: 881913 },
  { country: 'Bangladesh', capital: 'Dhaka', latitude: 23.8103, longitude: 90.4125, continent: 'Ásia', population: 164689383, area: 147570 },
  { country: 'Irã', capital: 'Teerã', latitude: 35.6892, longitude: 51.3890, continent: 'Ásia', population: 83992949, area: 1648195 },
  { country: 'Iraque', capital: 'Bagdá', latitude: 33.3152, longitude: 44.3661, continent: 'Ásia', population: 40222493, area: 438317 },
  { country: 'Arábia Saudita', capital: 'Riad', latitude: 24.7136, longitude: 46.6753, continent: 'Ásia', population: 34813871, area: 2149690 },
  { country: 'Israel', capital: 'Jerusalém', latitude: 31.7683, longitude: 35.2137, continent: 'Ásia', population: 8655535, area: 20770 },
  { country: 'Turquia', capital: 'Ancara', latitude: 39.9334, longitude: 32.8597, continent: 'Ásia/Europa', population: 84339067, area: 783562 },
  
  // África
  { country: 'Nigéria', capital: 'Abuja', latitude: 9.0765, longitude: 7.3986, continent: 'África', population: 206139589, area: 923768 },
  { country: 'Etiópia', capital: 'Adis Abeba', latitude: 9.1450, longitude: 38.7617, continent: 'África', population: 114963588, area: 1104300 },
  { country: 'Egito', capital: 'Cairo', latitude: 30.0444, longitude: 31.2357, continent: 'África', population: 102334404, area: 1001450 },
  { country: 'África do Sul', capital: 'Cidade do Cabo', latitude: -33.9249, longitude: 18.4241, continent: 'África', population: 59308690, area: 1221037 },
  { country: 'Quênia', capital: 'Nairobi', latitude: -1.2921, longitude: 36.8219, continent: 'África', population: 53771296, area: 580367 },
  { country: 'Uganda', capital: 'Kampala', latitude: 0.3476, longitude: 32.5825, continent: 'África', population: 45741007, area: 241038 },
  { country: 'Tanzânia', capital: 'Dodoma', latitude: -6.1630, longitude: 35.7516, continent: 'África', population: 59734218, area: 947303 },
  { country: 'Gana', capital: 'Acra', latitude: 5.6037, longitude: -0.1870, continent: 'África', population: 31072940, area: 238533 },
  { country: 'Marrocos', capital: 'Rabat', latitude: 34.0209, longitude: -6.8416, continent: 'África', population: 36910560, area: 446550 },
  { country: 'Argélia', capital: 'Argel', latitude: 36.7538, longitude: 3.0588, continent: 'África', population: 43851044, area: 2381741 },
  { country: 'Tunísia', capital: 'Túnis', latitude: 36.8065, longitude: 10.1815, continent: 'África', population: 11818619, area: 163610 },
  { country: 'Líbia', capital: 'Trípoli', latitude: 32.8872, longitude: 13.1913, continent: 'África', population: 6871292, area: 1759540 },
  { country: 'Angola', capital: 'Luanda', latitude: -8.8390, longitude: 13.2894, continent: 'África', population: 32866272, area: 1246700 },
  
  // Oceania
  { country: 'Austrália', capital: 'Camberra', latitude: -35.2809, longitude: 149.1300, continent: 'Oceania', population: 25499884, area: 7692024 },
  { country: 'Nova Zelândia', capital: 'Wellington', latitude: -41.2865, longitude: 174.7762, continent: 'Oceania', population: 4822233, area: 268838 },
  { country: 'Fiji', capital: 'Suva', latitude: -18.1248, longitude: 178.4501, continent: 'Oceania', population: 896445, area: 18274 },
  { country: 'Papua Nova Guiné', capital: 'Port Moresby', latitude: -9.4438, longitude: 147.1803, continent: 'Oceania', population: 8947024, area: 462840 }
];