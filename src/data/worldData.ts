export interface Location {
  name: string;
  lat: number;
  lon: number;
  population?: number;
  type: 'capital' | 'city' | 'province' | 'village';
}

export interface Country {
  name: string;
  code: string;
  capital: string;
  population: number;
  area: number;
  locations: Location[];
}

export interface Continent {
  name: string;
  countries: Country[];
}

export const worldData: Continent[] = [
  {
    name: "América do Norte",
    countries: [
      {
        name: "Estados Unidos",
        code: "US",
        capital: "Washington D.C.",
        population: 331002651,
        area: 9833517,
        locations: [
          { name: "Washington D.C.", lat: 38.9072, lon: -77.0369, population: 705749, type: "capital" },
          { name: "Nova York", lat: 40.7128, lon: -74.0060, population: 8336817, type: "city" },
          { name: "Los Angeles", lat: 34.0522, lon: -118.2437, population: 3979576, type: "city" },
          { name: "Chicago", lat: 41.8781, lon: -87.6298, population: 2693976, type: "city" },
          { name: "Califórnia", lat: 36.7783, lon: -119.4179, population: 39538223, type: "province" },
          { name: "Texas", lat: 31.9686, lon: -99.9018, population: 29145505, type: "province" },
          { name: "Aspen", lat: 39.1911, lon: -106.8175, population: 7431, type: "village" }
        ]
      },
      {
        name: "Canadá",
        code: "CA",
        capital: "Ottawa",
        population: 38000000,
        area: 9984670,
        locations: [
          { name: "Ottawa", lat: 45.4215, lon: -75.6972, population: 994837, type: "capital" },
          { name: "Toronto", lat: 43.6532, lon: -79.3832, population: 2731571, type: "city" },
          { name: "Vancouver", lat: 49.2827, lon: -123.1207, population: 631486, type: "city" },
          { name: "Ontário", lat: 51.2538, lon: -85.3232, population: 14734014, type: "province" },
          { name: "Quebec", lat: 52.9399, lon: -73.5491, population: 8484965, type: "province" },
          { name: "Banff", lat: 51.1784, lon: -115.5708, population: 7847, type: "village" }
        ]
      },
      {
        name: "México",
        code: "MX",
        capital: "Cidade do México",
        population: 128932753,
        area: 1964375,
        locations: [
          { name: "Cidade do México", lat: 19.4326, lon: -99.1332, population: 9209944, type: "capital" },
          { name: "Guadalajara", lat: 20.6597, lon: -103.3496, population: 1385629, type: "city" },
          { name: "Monterrey", lat: 25.6866, lon: -100.3161, population: 1135512, type: "city" },
          { name: "Jalisco", lat: 20.6595, lon: -103.3494, population: 8348151, type: "province" },
          { name: "Tequila", lat: 20.8815, lon: -103.8349, population: 40697, type: "village" }
        ]
      }
    ]
  },
  {
    name: "América do Sul",
    countries: [
      {
        name: "Brasil",
        code: "BR",
        capital: "Brasília",
        population: 215313498,
        area: 8514877,
        locations: [
          { name: "Brasília", lat: -15.8267, lon: -47.9218, population: 3055149, type: "capital" },
          { name: "São Paulo", lat: -23.5505, lon: -46.6333, population: 12325232, type: "city" },
          { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729, population: 6748000, type: "city" },
          { name: "Salvador", lat: -12.9714, lon: -38.5014, population: 2886698, type: "city" },
          { name: "São Paulo", lat: -23.5505, lon: -46.6333, population: 46289333, type: "province" },
          { name: "Minas Gerais", lat: -18.5122, lon: -44.5550, population: 21411923, type: "province" },
          { name: "Paraty", lat: -23.2176, lon: -44.7131, population: 43207, type: "village" }
        ]
      },
      {
        name: "Argentina",
        code: "AR",
        capital: "Buenos Aires",
        population: 45195774,
        area: 2780400,
        locations: [
          { name: "Buenos Aires", lat: -34.6118, lon: -58.3960, population: 3075646, type: "capital" },
          { name: "Córdoba", lat: -31.4201, lon: -64.1888, population: 1391374, type: "city" },
          { name: "Rosario", lat: -32.9442, lon: -60.6505, population: 1193605, type: "city" },
          { name: "Buenos Aires", lat: -36.6769, lon: -60.5588, population: 17569053, type: "province" },
          { name: "El Calafate", lat: -50.3376, lon: -72.2648, population: 22000, type: "village" }
        ]
      }
    ]
  },
  {
    name: "Europa",
    countries: [
      {
        name: "Alemanha",
        code: "DE",
        capital: "Berlim",
        population: 83783942,
        area: 357114,
        locations: [
          { name: "Berlim", lat: 52.5200, lon: 13.4050, population: 3669491, type: "capital" },
          { name: "Munique", lat: 48.1351, lon: 11.5820, population: 1484226, type: "city" },
          { name: "Hamburgo", lat: 53.5511, lon: 9.9937, population: 1899160, type: "city" },
          { name: "Baviera", lat: 49.0134, lon: 11.4041, population: 13124737, type: "province" },
          { name: "Rothenburg", lat: 49.3755, lon: 10.1844, population: 11000, type: "village" }
        ]
      },
      {
        name: "França",
        code: "FR",
        capital: "Paris",
        population: 65273511,
        area: 643801,
        locations: [
          { name: "Paris", lat: 48.8566, lon: 2.3522, population: 2165423, type: "capital" },
          { name: "Marselha", lat: 43.2965, lon: 5.3698, population: 861635, type: "city" },
          { name: "Lyon", lat: 45.7640, lon: 4.8357, population: 515695, type: "city" },
          { name: "Provence", lat: 43.9352, lon: 6.0679, population: 5081101, type: "province" },
          { name: "Annecy", lat: 45.8992, lon: 6.1294, population: 52029, type: "village" }
        ]
      }
    ]
  },
  {
    name: "Ásia",
    countries: [
      {
        name: "China",
        code: "CN",
        capital: "Pequim",
        population: 1439323776,
        area: 9596961,
        locations: [
          { name: "Pequim", lat: 39.9042, lon: 116.4074, population: 21542000, type: "capital" },
          { name: "Xangai", lat: 31.2304, lon: 121.4737, population: 27058479, type: "city" },
          { name: "Guangzhou", lat: 23.1291, lon: 113.2644, population: 15300000, type: "city" },
          { name: "Guangdong", lat: 23.3790, lon: 113.7633, population: 126012510, type: "province" },
          { name: "Lijiang", lat: 26.8721, lon: 100.2240, population: 1244769, type: "village" }
        ]
      },
      {
        name: "Japão",
        code: "JP",
        capital: "Tóquio",
        population: 125836021,
        area: 377930,
        locations: [
          { name: "Tóquio", lat: 35.6762, lon: 139.6503, population: 37400068, type: "capital" },
          { name: "Osaka", lat: 34.6937, lon: 135.5023, population: 2691185, type: "city" },
          { name: "Kyoto", lat: 35.0116, lon: 135.7681, population: 1475183, type: "city" },
          { name: "Honshu", lat: 36.2048, lon: 138.2529, population: 104000000, type: "province" },
          { name: "Shirakawa-go", lat: 36.2583, lon: 136.9061, population: 1700, type: "village" }
        ]
      }
    ]
  },
  {
    name: "África",
    countries: [
      {
        name: "África do Sul",
        code: "ZA",
        capital: "Cidade do Cabo",
        population: 59308690,
        area: 1221037,
        locations: [
          { name: "Cidade do Cabo", lat: -33.9249, lon: 18.4241, population: 4618000, type: "capital" },
          { name: "Joanesburgo", lat: -26.2041, lon: 28.0473, population: 5635127, type: "city" },
          { name: "Durban", lat: -29.8587, lon: 31.0218, population: 3442361, type: "city" },
          { name: "Gauteng", lat: -26.2708, lon: 28.1123, population: 15176116, type: "province" },
          { name: "Hermanus", lat: -34.4187, lon: 19.2345, population: 49000, type: "village" }
        ]
      }
    ]
  },
  {
    name: "Oceania",
    countries: [
      {
        name: "Austrália",
        code: "AU",
        capital: "Camberra",
        population: 25499884,
        area: 7692024,
        locations: [
          { name: "Camberra", lat: -35.2809, lon: 149.1300, population: 431380, type: "capital" },
          { name: "Sydney", lat: -33.8688, lon: 151.2093, population: 5312163, type: "city" },
          { name: "Melbourne", lat: -37.8136, lon: 144.9631, population: 5078193, type: "city" },
          { name: "Nova Gales do Sul", lat: -31.2532, lon: 146.9211, population: 8166369, type: "province" },
          { name: "Byron Bay", lat: -28.6474, lon: 153.6020, population: 9246, type: "village" }
        ]
      }
    ]
  }
];