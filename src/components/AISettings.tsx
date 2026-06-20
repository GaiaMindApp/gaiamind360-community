import { useState } from 'react';
import { Settings, Key } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { aiService, AI_PROVIDERS, AIProviderType } from '../services/aiService';

export function AISettings() {
  const [provider, setProvider] = useState<AIProviderType>(AI_PROVIDERS.MOCK);
  const [apiKey, setApiKey] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    aiService.setProvider(provider);
    if (apiKey.trim() && provider !== AI_PROVIDERS.MOCK) {
      aiService.setApiKey(provider, apiKey);
    }
    setIsOpen(false);
    setApiKey('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-[#00E676]/30 text-[#E0F7FA]">
          <Settings className="w-4 h-4 mr-2" />
          Configurar IA
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#003049] border-[#00E676]/30">
        <DialogHeader>
          <DialogTitle className="text-[#00E676]">Configurações de IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-[#E0F7FA] text-sm mb-2 block">Provedor de IA</label>
            <Select value={provider} onValueChange={(value: AIProviderType) => setProvider(value)}>
              <SelectTrigger className="bg-[#003049]/60 border-[#00E676]/30 text-[#E0F7FA]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#003049] border-[#00E676]/30">
                <SelectItem value={AI_PROVIDERS.MOCK}>IA Simulada (Sem API)</SelectItem>
                <SelectItem value={AI_PROVIDERS.OPENAI}>OpenAI (ChatGPT)</SelectItem>
                <SelectItem value={AI_PROVIDERS.GEMINI}>Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[#E0F7FA] text-sm mb-2 block">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === AI_PROVIDERS.MOCK ? "Não é necessário para IA simulada" : "Cole sua API key aqui..."}
              disabled={provider === AI_PROVIDERS.MOCK}
              className="bg-[#003049]/60 border-[#00E676]/30 text-[#E0F7FA] disabled:opacity-50"
            />
          </div>
          <Button onClick={handleSave} className="w-full bg-[#00E676] text-[#003049]">
            <Key className="w-4 h-4 mr-2" />
            Salvar Configuração
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}