import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Zap, Send, Download, Loader, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import researchService, { ResearchMetadata, ResearchAnalysis, ResearchPublication } from '../services/researchService';
import ResearchHistory from './ResearchHistory';
import '../styles/components.css';

export function Research() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [step, setStep] = useState<'upload' | 'preview' | 'analysis' | 'publish' | 'published'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [metadata, setMetadata] = useState<ResearchMetadata | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [analysis, setAnalysis] = useState<ResearchAnalysis | null>(null);
  const [aiInsights, setAiInsights] = useState<any[] | null>(null);
  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(t('research.error_too_large', { size: sizeMB }));
      return;
    }

    const warning = researchService.getFileSizeWarning(file.size);
    if (warning) {
      console.warn(warning);
    }

    setLoading(true);
    setError(null);

    try {
      const result = await researchService.uploadDataset(file);
      setMetadata(result.metadata);
      setPreview(result.preview);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('research.error_upload'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!metadata) return;

    setLoading(true);
    setError(null);

    try {
      const result = await researchService.analyzeDataset(metadata.research_id);
      setAnalysis(result.analysis);
      setStep('analysis');
      setAiInsights(null);
      
      try {
        const aiResult = await generateGeminiInsights(result.analysis);
        setAiInsights(aiResult);
      } catch (aiErr) {
        console.warn('Gemini falhou:', aiErr);
        setAiInsights(result.analysis.detailed_insights || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('research.error_analyse'));
    } finally {
      setLoading(false);
    }
  };

  const generateGeminiInsights = async (analysis: ResearchAnalysis): Promise<any[]> => {
    // Usa backend CognitiveKernel em vez de chamar Gemini directamente (API key removida)
    try {
      const { authFetch } = await import('../services/authFetch');
      const { API_BASE } = await import('../services/apiBaseConfig');
      const prompt = `Analise os seguintes dados de pesquisa e fornece 3-4 insights principais:\nEstatisticas: ${JSON.stringify(analysis.statistics)}\nCorrelacoes: ${JSON.stringify(analysis.correlations)}\nAnomalias: ${JSON.stringify(analysis.anomalies)}`;
      const res = await authFetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: '_research_insights', message: prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.response || '';
        try {
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : [{ section: 'Analise GaiaMind AI', content: text }];
        } catch {
          return [{ section: 'Analise GaiaMind AI', content: text }];
        }
      }
    } catch (e) {
      console.warn('[Research] backend insights failed:', e);
    }
    return [{ section: 'Analise GaiaMind AI', content: 'Analise nao disponivel. Verifique a conexao com o backend.' }];
  };

  const handlePublish = async () => {
    if (!metadata || !analysis || !title.trim()) {
      setError(t('research.error_fill_fields'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const publication = await researchService.publishResearch(
        metadata.research_id,
        title,
        description
      );
      setPublications([...publications, publication]);
      setStep('published');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('research.error_publish'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (researchId: string, format: 'json' | 'csv') => {
    try {
      const blob = await researchService.exportResearch(researchId, format);
      researchService.downloadFile(blob, `research_${researchId}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('research.error_export'));
    }
  };

  return (
    <div className="component-container research-container">
      <div className="component-wrapper section">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="section-title">{t('research.title')}</h1>
          <p className="text-responsive-md" style={{ color: 'rgba(224, 247, 250, 0.7)', marginBottom: '2rem' }}>
            {t('research.subtitle')}
          </p>
        </motion.div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(0, 230, 118, 0.2)', overflowX: 'auto' }}>
          <button
            onClick={() => setTab('new')}
            style={{
              padding: '0.75rem 1.25rem',
              background: tab === 'new' ? 'rgba(0, 230, 118, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: tab === 'new' ? '2px solid #00E676' : 'none',
              color: tab === 'new' ? '#00E676' : 'rgba(224, 247, 250, 0.6)',
              cursor: 'pointer',
              fontSize: 'clamp(0.8rem, 2.5vw, 1rem)',
              fontWeight: tab === 'new' ? 'bold' : 'normal',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap',
              minHeight: '44px',
            }}
          >
            {t('research.tab_new')}
          </button>
          <button
            onClick={() => setTab('history')}
            style={{
              padding: '0.75rem 1.25rem',
              background: tab === 'history' ? 'rgba(0, 230, 118, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: tab === 'history' ? '2px solid #00E676' : 'none',
              color: tab === 'history' ? '#00E676' : 'rgba(224, 247, 250, 0.6)',
              cursor: 'pointer',
              fontSize: 'clamp(0.8rem, 2.5vw, 1rem)',
              fontWeight: tab === 'history' ? 'bold' : 'normal',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <History style={{ display: 'inline', marginRight: '0.5rem', width: '1rem', flexShrink: 0 }} />
            {t('research.tab_history')}
          </button>
        </div>

        {/* TAB CONTENT */}
        {tab === 'history' ? (
          <ResearchHistory />
        ) : (
          <>
            {error && (
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{
                  background: 'rgba(255, 107, 107, 0.2)',
                  border: '1px solid rgba(255, 107, 107, 0.5)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  color: '#ff6b6b'
                }}
              >
                {error}
              </motion.div>
            )}

            {/* STEP 1: UPLOAD */}
            {step === 'upload' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="card-base mb-responsive"
              >
                <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>{t('research.upload_title')}</h2>
                <div
                  onClick={handleClickUpload}
                  style={{
                    border: '2px dashed rgba(0, 230, 118, 0.3)',
                    borderRadius: '0.75rem',
                    padding: 'clamp(1rem, 4vw, 2rem)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#00E676';
                    e.currentTarget.style.background = 'rgba(0, 230, 118, 0.1)';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 230, 118, 0.3)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(file);
                      if (fileInputRef.current) {
                        fileInputRef.current.files = dataTransfer.files;
                        handleFileUpload({ target: fileInputRef.current } as any);
                      }
                    }
                  }}
                >
                  <Upload style={{ width: '3rem', height: '3rem', color: '#00E676', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'rgba(224, 247, 250, 1)', marginBottom: '0.5rem' }}>
                    {t('research.drag_or_click')}
                  </p>
                  <p style={{ color: 'rgba(224, 247, 250, 0.6)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {t('research.supported_formats')}
                  </p>
                  <p style={{ color: 'rgba(255, 107, 107, 0.8)', fontSize: '0.75rem' }}>
                    {t('research.max_size')}
                  </p>
                  <button 
                    className="btn-responsive btn-primary" 
                    style={{ marginTop: '1rem', minHeight: '44px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClickUpload();
                    }}
                  >
                    {loading ? t('research.loading') : t('research.select_file')}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.xlsx"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </motion.div>
            )}

            {/* STEP 2: PREVIEW */}
            {step === 'preview' && metadata && preview && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="card-base mb-responsive"
              >
                <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>{t('research.preview_title')}</h2>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ color: 'rgba(224, 247, 250, 0.8)', marginBottom: '0.5rem' }}>
                    <strong>{t('research.file_label')}:</strong> {metadata.filename}
                  </p>
                  <p style={{ color: 'rgba(224, 247, 250, 0.8)', marginBottom: '0.5rem' }}>
                    <strong>{t('research.rows_label')}:</strong> {metadata.rows} | <strong>{t('research.columns_label')}:</strong> {metadata.columns}
                  </p>
                  <p style={{ color: 'rgba(224, 247, 250, 0.6)', fontSize: '0.875rem', wordBreak: 'break-word' }}>
                    <strong>{t('research.variables_label')}:</strong> {metadata.column_names.join(', ')}
                  </p>
                </div>

                <div style={{ overflowX: 'auto', marginBottom: '1.5rem', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0, 230, 118, 0.3)' }}>
                        {metadata.column_names.map((col) => (
                          <th key={col} style={{ padding: '0.75rem', textAlign: 'left', color: '#00E676' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0, 230, 118, 0.1)' }}>
                          {metadata.column_names.map((col) => (
                            <td key={col} style={{ padding: '0.75rem', color: 'rgba(224, 247, 250, 0.8)' }}>
                              {String(row[col] || '-').substring(0, 50)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn-responsive btn-primary"
                    onClick={handleAnalyze}
                    disabled={loading}
                    style={{ minHeight: '44px' }}
                  >
                    {loading ? <Loader className="spinner" /> : <Zap style={{ width: '1rem', marginRight: '0.5rem' }} />}
                    {loading ? t('research.analysing') : t('research.analyse_btn')}
                  </button>
                  <button
                    className="btn-responsive btn-secondary"
                    onClick={() => setStep('upload')}
                    style={{ minHeight: '44px' }}
                  >
                    {t('research.back')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: ANALYSIS */}
            {step === 'analysis' && analysis && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="card-base mb-responsive"
              >
                <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>{t('research.analysis_title')}</h2>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#00E676', marginBottom: '1rem' }}>{t('research.insights_title')}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {aiInsights && aiInsights.length > 0 ? (
                      aiInsights.map((insight, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          style={{ background: 'rgba(0, 230, 118, 0.1)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '3px solid #00E676' }}
                        >
                          <p style={{ color: '#00E676', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {insight.section}
                          </p>
                          <p style={{ color: 'rgba(224, 247, 250, 0.8)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                            {insight.content}
                          </p>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ color: 'rgba(0, 230, 118, 0.8)', textAlign: 'center', padding: '2rem' }}
                      >
                        <Loader style={{ width: '2rem', height: '2rem', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                        <p>{t('research.generating_insights')}</p>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#00E676', marginBottom: '1rem' }}>{t('research.statistics_title')}</h3>
                  <div className="grid-2">
                    {Object.entries(analysis.statistics).map(([col, stats]: [string, any]) => (
                      <div key={col} style={{ background: 'rgba(0, 230, 118, 0.1)', padding: '1rem', borderRadius: '0.5rem' }}>
                        <p style={{ color: '#00E676', fontWeight: 'bold', marginBottom: '0.5rem' }}>{col}</p>
                        <p style={{ color: 'rgba(224, 247, 250, 0.8)', fontSize: '0.875rem' }}>
                          {t('research.mean')}: {stats.mean?.toFixed(2)} | {t('research.min')}: {stats.min?.toFixed(2)} | {t('research.max')}: {stats.max?.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn-responsive btn-primary"
                    onClick={() => setStep('publish')}
                    style={{ minHeight: '44px' }}
                  >
                    <Send style={{ width: '1rem', marginRight: '0.5rem' }} />
                    {t('research.publish_btn')}
                  </button>
                  <button
                    className="btn-responsive btn-secondary"
                    onClick={() => setStep('preview')}
                    style={{ minHeight: '44px' }}
                  >
                    {t('research.back')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: PUBLISH */}
            {step === 'publish' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="card-base mb-responsive"
              >
                <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>{t('research.publish_title')}</h2>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ color: 'rgba(224, 247, 250, 1)', display: 'block', marginBottom: '0.5rem' }}>
                    {t('research.research_title_label')}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-responsive"
                    placeholder={t('research.title_placeholder')}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ color: 'rgba(224, 247, 250, 1)', display: 'block', marginBottom: '0.5rem' }}>
                    {t('research.description_label')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-responsive"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder={t('research.description_placeholder')}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn-responsive btn-primary"
                    onClick={handlePublish}
                    disabled={loading || !title.trim()}
                    style={{ minHeight: '44px' }}
                  >
                    {loading ? <Loader className="spinner" /> : <Send style={{ width: '1rem', marginRight: '0.5rem' }} />}
                    {loading ? t('research.publishing') : t('research.publish_action')}
                  </button>
                  <button
                    className="btn-responsive btn-secondary"
                    onClick={() => setStep('analysis')}
                    style={{ minHeight: '44px' }}
                  >
                    {t('research.back')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: PUBLISHED */}
            {step === 'published' && metadata && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="card-base mb-responsive"
              >
                <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>{t('research.published_title')}</h2>
                <p style={{ color: 'rgba(224, 247, 250, 0.8)', marginBottom: '1.5rem', wordBreak: 'break-all' }}>
                  {t('research.research_id_label')}: <strong>{metadata.research_id}</strong>
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn-responsive btn-secondary"
                    onClick={() => handleExport(metadata.research_id, 'json')}
                    style={{ minHeight: '44px' }}
                  >
                    <Download style={{ width: '1rem', marginRight: '0.5rem' }} />
                    {t('research.export_json')}
                  </button>
                  <button
                    className="btn-responsive btn-secondary"
                    onClick={() => handleExport(metadata.research_id, 'csv')}
                    style={{ minHeight: '44px' }}
                  >
                    <Download style={{ width: '1rem', marginRight: '0.5rem' }} />
                    {t('research.export_csv')}
                  </button>
                </div>

                <button
                  className="btn-responsive btn-primary"
                  style={{ minHeight: '44px' }}
                  onClick={() => {
                    setStep('upload');
                    setMetadata(null);
                    setPreview(null);
                    setAnalysis(null);
                    setAiInsights(null);
                    setTitle('');
                    setDescription('');
                  }}
                >
                  {t('research.new_research')}
                </button>
              </motion.div>
            )}

            {/* PUBLISHED RESEARCH LIST */}
            {publications.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="card-base"
              >
                <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>{t('research.published_list_title')}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {publications.map((pub) => (
                    <div key={pub.research_id} style={{ background: 'rgba(0, 230, 118, 0.1)', padding: '1rem', borderRadius: '0.5rem' }}>
                      <h3 style={{ color: '#00E676', marginBottom: '0.5rem' }}>{pub.title}</h3>
                      <p style={{ color: 'rgba(224, 247, 250, 0.8)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        {pub.description}
                      </p>
                      <p style={{ color: 'rgba(224, 247, 250, 0.6)', fontSize: '0.75rem' }}>
                        ID: {pub.research_id} | {t('research.published_date')}: {new Date(pub.published_date || '').toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
