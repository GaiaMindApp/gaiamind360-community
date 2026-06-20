import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Brain, ArrowLeft, Sparkles, Copy, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { worldCountries } from '../data/worldCountries';
import { authFetch } from '../services/authFetch';
import { sanitizeText } from '../utils/sanitizeText';

interface SimularPoliticaProps {
  onNavigateBack?: () => void;
}

export function SimularPolitica({ onNavigateBack }: SimularPoliticaProps = {}) {
  const [selectedCountry, setSelectedCountry] = useState('AO');
  const [customAnalysis, setCustomAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  async function handleAnalyze() {
    if (!customAnalysis.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisResult('');
    
    try {
      const response = await authFetch(API_ENDPOINTS.POLICY.SIMULATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country_iso: selectedCountry,
          country_name: worldCountries.find(c => c.code === selectedCountry)?.name || selectedCountry,
          policy_description: customAnalysis
        })
      });

      if (!response.ok) throw new Error('Erro na análise');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('Sem resposta do servidor');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        setAnalysisResult(prev => prev + chunk);
      }
    } catch (error) {
      console.error('Erro:', error);
      setAnalysisResult('Erro ao processar análise. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleCopy = () => {
    console.log('Botão copiar clicado');
    console.log('Texto a copiar:', analysisResult.substring(0, 50));
    
    if (!analysisResult) {
      alert('Nenhuma análise para copiar');
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = analysisResult;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('Texto copiado com sucesso');
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
      alert('Erro ao copiar');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const handleDownloadPDF = async () => {
    console.log('Botão download clicado');
    
    if (!analysisResult) {
      alert('Nenhuma análise para baixar');
      return;
    }

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      console.log('html2pdf carregado');

      const makeParagraph = (text: string) => {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.margin = '10px 0';
        p.style.color = '#E0F7FA';
        p.style.lineHeight = '1.5';
        p.style.fontSize = '12px';
        return p;
      };

      const makeHeading = (text: string, level: 2 | 3) => {
        const heading = document.createElement(level === 2 ? 'h2' : 'h3');
        heading.textContent = text;
        heading.style.color = '#00E676';
        heading.style.marginTop = level === 2 ? '20px' : '15px';
        heading.style.marginBottom = level === 2 ? '10px' : '8px';
        heading.style.fontSize = level === 2 ? '18px' : '14px';
        heading.style.fontWeight = '600';
        return heading;
      };

      const container = document.createElement('div');
      container.style.backgroundColor = '#003049';
      container.style.color = '#E0F7FA';
      container.style.padding = '20px';
      container.style.fontFamily = 'Arial, sans-serif';

      const safeText = sanitizeText(analysisResult);
      const lines = safeText.split('\n');
      lines.forEach((line) => {
        if (line.startsWith('## ')) {
          container.appendChild(makeHeading(line.replace('## ', ''), 2));
        } else if (line.startsWith('### ')) {
          container.appendChild(makeHeading(line.replace('### ', ''), 3));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          const li = document.createElement('li');
          li.textContent = line.replace(/^[-*] /, '');
          li.style.color = '#E0F7FA';
          li.style.marginBottom = '4px';
          const ul = container.lastElementChild instanceof HTMLUListElement ? container.lastElementChild : document.createElement('ul');
          if (!(container.lastElementChild instanceof HTMLUListElement)) {
            ul.style.paddingLeft = '18px';
            ul.style.margin = '6px 0';
            container.appendChild(ul);
          }
          ul.appendChild(li);
        } else if (line.trim() === '') {
          const spacer = document.createElement('div');
          spacer.style.height = '10px';
          container.appendChild(spacer);
        } else {
          container.appendChild(makeParagraph(line));
        }
      });

      const opt = {
        margin: 10,
        filename: `analise_politica_${selectedCountry}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(container).save();
      console.log('PDF gerado com sucesso');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF: ' + (err instanceof Error ? err.message : 'Desconhecido'));
    }
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-[#00E676] text-xl font-bold mt-6 mb-3">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-[#00E676] text-lg font-semibold mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('| ')) {
        const tableLines = [];
        while (i < lines.length && lines[i].startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        i--;

        const rows = tableLines.map(l => l.split('|').filter(c => c.trim()));
        elements.push(
          <div key={i} className="overflow-x-auto mb-3">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className={idx === 0 ? 'bg-[#003049]/80' : ''}>
                    {row.map((cell, cidx) => (
                      <td
                        key={cidx}
                        className={`border border-[#00E676]/30 p-2 ${
                          idx === 0 ? 'text-[#00E676] font-bold' : 'text-[#E0F7FA]'
                        }`}
                      >
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={i} className="text-[#E0F7FA] mb-1 ml-4">
            {line.replace('- ', '')}
          </li>
        );
      } else if (line.startsWith('* ')) {
        elements.push(
          <li key={i} className="text-[#E0F7FA] mb-1 ml-4">
            {line.replace('* ', '')}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
      } else if (line.trim()) {
        elements.push(
          <p key={i} className="text-[#E0F7FA] mb-3 leading-relaxed">
            {line}
          </p>
        );
      }

      i++;
    }

    return elements;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#003049]/20 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[#00E676] text-3xl font-bold mb-2">Análise Ambiental Profissional</h1>
            <p className="text-[#E0F7FA]/70">Análise com IA avançada e dados científicos</p>
          </div>
          {onNavigateBack && (
            <Button onClick={onNavigateBack} className="bg-[#003049]/60 border border-[#00E676]/30 text-[#E0F7FA] hover:bg-[#003049]/80 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
        </motion.div>

        {/* Input Section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8">
          <Card className="bg-[#003049]/40 border-[#00E676]/30 p-6">
            <h2 className="text-[#00E676] font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Configuração da Análise
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[#E0F7FA] text-sm mb-2 block">País</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-[#003049]/60 border border-[#00E676]/30 text-[#E0F7FA] rounded-lg p-2 focus:outline-none focus:border-[#00E676]"
                >
                  {worldCountries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !customAnalysis.trim()}
                  className="w-full bg-[#00E676] text-[#003049] hover:bg-[#00E676]/90 font-medium h-10"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {isAnalyzing ? 'Analisando...' : 'Analisar Política'}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-[#E0F7FA] text-sm mb-2 block">Descreva a Política Ambiental</label>
              <textarea
                value={customAnalysis}
                onChange={(e) => setCustomAnalysis(e.target.value)}
                placeholder="Descreva a política ambiental que deseja analisar..."
                className="w-full bg-[#003049]/60 border border-[#00E676]/30 text-[#E0F7FA] rounded-lg p-3 min-h-[120px] focus:outline-none focus:border-[#00E676] resize-none"
              />
            </div>
          </Card>
        </motion.div>

        {/* Result Section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-[#003049]/40 border-[#00E676]/30 p-6 min-h-[400px]">
            {isAnalyzing && !analysisResult && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#00E676]/30 border-t-[#00E676] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[#E0F7FA]">Analisando política ambiental...</p>
                </div>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[#00E676] font-bold flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Análise Profissional
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                        copyFeedback
                          ? 'bg-green-500/80 text-white'
                          : 'bg-[#003049]/60 border border-[#00E676]/30 text-[#E0F7FA] hover:bg-[#003049]/80'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                      {copyFeedback ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="bg-[#00E676] text-[#003049] hover:bg-[#00E676]/90 px-3 py-2 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>

                <div 
                  ref={contentRef}
                  className="bg-[#003049]/60 rounded-lg p-4 max-h-[600px] overflow-y-auto"
                >
                  <div className="text-sm leading-relaxed">
                    {renderMarkdown(analysisResult)}
                  </div>
                </div>
              </div>
            )}

            {!isAnalyzing && !analysisResult && (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Brain className="w-16 h-16 text-[#00E676]/30 mx-auto mb-4" />
                  <p className="text-[#E0F7FA]/60">Descreva uma política ambiental para começar a análise</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
