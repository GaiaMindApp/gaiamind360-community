import { allWorldCountries } from '../data/allWorldCountries';
import { API_BASE } from './apiBaseConfig';
import { authFetch } from './authFetch';

export class PolicySimulationClient {
  static async simulatePolicy(selectedCountry: string, selectedPolicy: string) {
    if (!selectedCountry) {
      console.error('Nenhum país selecionado');
      return null;
    }

    try {
      const country = allWorldCountries.find(c => c.code === selectedCountry);
      const countryName = country?.name || selectedCountry;

      const policyMap: Record<string, any> = {
        'carbon-tax': {
          industrial_emission_cut_pct: 15,
          renewable_boost_pct: 10,
          deforestation_reduction_pct: 5
        },
        'renewable': {
          renewable_boost_pct: 30,
          industrial_emission_cut_pct: 20,
          deforestation_reduction_pct: 0
        },
        'reforestation': {
          deforestation_reduction_pct: 25,
          renewable_boost_pct: 5,
          industrial_emission_cut_pct: 5
        },
        'ocean': {
          deforestation_reduction_pct: 10,
          renewable_boost_pct: 5,
          industrial_emission_cut_pct: 5
        }
      };

      const payload = {
        country_iso: selectedCountry,
        country_name: countryName,
        policy: policyMap[selectedPolicy] || policyMap['carbon-tax']
      };

      console.log('Enviando simulação:', JSON.stringify(payload).replace(/[\r\n]/g, ' '));

      const response = await authFetch(`${API_BASE}/policy/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(() => { const s = localStorage.getItem('gaiamind-auth'); const t = s ? JSON.parse(s).token : null; return t ? { Authorization: `Bearer ${t}` } : {}; })()
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        const safeError = error.replace(/[\r\n]/g, ' ').slice(0, 200);
        console.error('Erro na resposta:', safeError);
        throw new Error(`HTTP ${response.status}: ${safeError}`);
      }

      const data = await response.json();
      console.log('Simulação recebida:', data);
      return data;
    } catch (error) {
      const safeMsg = (error instanceof Error ? error.message : 'Desconhecido').replace(/[\r\n]/g, ' ');
      console.error('Erro na simulacao:', safeMsg);
      alert('Erro ao simular política: ' + safeMsg);
      return null;
    }
  }
}
