import { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Eye, Zap, Send, Download, ArrowRight, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../styles/components.css';

export function ResearchVisualization() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: Upload,
      title: 'Upload',
      description: 'CSV / JSON / XLSX',
      color: '#00E676',
      details: 'Validação automática de formato'
    },
    {
      icon: Eye,
      title: 'Preview',
      description: 'Visualização rápida',
      color: '#00E676',
      details: 'Metadados e primeiras linhas'
    },
    {
      icon: Zap,
      title: 'Analysis',
      description: 'GaiaMind AI',
      color: '#00E676',
      details: 'Estatísticas, Tendências, Anomalias com IA'
    },
    {
      icon: Send,
      title: 'Publish',
      description: 'Rede GaiaMind',
      color: '#00E676',
      details: 'Publicação científica'
    },
    {
      icon: Download,
      title: 'Export',
      description: 'CSV / JSON',
      color: '#00E676',
      details: 'Compartilhar resultados'
    }
  ];

  const features = [
    {
      icon: BarChart3,
      title: 'Estatísticas',
      items: ['Média', 'Desvio Padrão', 'Min/Max', 'Valores Faltantes']
    },
    {
      icon: TrendingUp,
      title: 'Tendências',
      items: ['Regressão Linear', 'Crescimento/Queda', 'Padrões Temporais', 'Previsões']
    },
    {
      icon: AlertCircle,
      title: 'Anomalias',
      items: ['Método IQR', 'Outliers', 'Inconsistências', 'Alertas']
    }
  ];

  return (
    <div className="component-container">
      <div className="component-wrapper section">
        {/* HEADER */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <h1 className="section-title">🔬 Research Lab</h1>
          <p className="text-responsive-md" style={{ color: 'rgba(224, 247, 250, 0.7)' }}>
            Laboratório Experimental com GaiaMind AI
          </p>
        </motion.div>

        {/* FLUXO VISUAL */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="card-base mb-responsive"
        >
          <h2 style={{ color: '#00E676', marginBottom: '2rem', textAlign: 'center' }}>Fluxo de Experimentação</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Desktop View */}
            <div style={{ display: 'none' }} className="hide-mobile">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setActiveStep(i)}
                      style={{ cursor: 'pointer', flex: '0 0 auto' }}
                    >
                      <div
                        style={{
                          background: activeStep === i ? 'rgba(0, 230, 118, 0.2)' : 'rgba(0, 230, 118, 0.05)',
                          border: `2px solid ${activeStep === i ? '#00E676' : 'rgba(0, 230, 118, 0.3)'}`,
                          borderRadius: '1rem',
                          padding: '1.5rem',
                          textAlign: 'center',
                          minWidth: '140px',
                          transition: 'all 0.3s'
                        }}
                      >
                        <Icon style={{ width: '2rem', height: '2rem', color: '#00E676', margin: '0 auto 0.5rem' }} />
                        <p style={{ color: '#00E676', fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          {step.title}
                        </p>
                        <p style={{ color: 'rgba(224, 247, 250, 0.6)', fontSize: '0.75rem' }}>
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Mobile View */}
            <div style={{ display: 'block' }} className="show-mobile">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div
                        style={{
                          background: 'rgba(0, 230, 118, 0.1)',
                          border: '1px solid rgba(0, 230, 118, 0.3)',
                          borderRadius: '0.75rem',
                          padding: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}
                      >
                        <Icon style={{ width: '1.5rem', height: '1.5rem', color: '#00E676', flexShrink: 0 }} />
                        <div>
                          <p style={{ color: '#00E676', fontWeight: 'bold', fontSize: '0.875rem' }}>
                            {i + 1}. {step.title}
                          </p>
                          <p style={{ color: 'rgba(224, 247, 250, 0.6)', fontSize: '0.75rem' }}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Detalhes do Step Ativo */}
            {activeStep !== undefined && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{
                  background: 'rgba(0, 230, 118, 0.05)',
                  border: '1px solid rgba(0, 230, 118, 0.3)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  marginTop: '1rem'
                }}
              >
                <p style={{ color: '#00E676', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {steps[activeStep].title}
                </p>
                <p style={{ color: 'rgba(224, 247, 250, 0.8)', fontSize: '0.875rem' }}>
                  {steps[activeStep].details}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* FUNCIONALIDADES */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-responsive"
        >
          <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>📊 An\u00e1lise com GaiaMind AI</h2>
          <div className="grid-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="card-base"
                >
                  <Icon style={{ width: '2rem', height: '2rem', color: '#00E676', marginBottom: '1rem' }} />
                  <h3 style={{ color: '#00E676', marginBottom: '1rem' }}>{feature.title}</h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {feature.items.map((item, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(224, 247, 250, 0.8)', fontSize: '0.875rem' }}>
                        <div style={{ width: '0.25rem', height: '0.25rem', background: '#00E676', borderRadius: '50%' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ENDPOINTS */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card-base mb-responsive"
        >
          <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>🔗 Endpoints Backend</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { method: 'POST', endpoint: '/research/upload', desc: 'Upload e validação' },
              { method: 'POST', endpoint: '/research/analyze/{id}', desc: 'An\u00e1lise com GaiaMind AI' },
              { method: 'POST', endpoint: '/research/publish/{id}', desc: 'Publicação' },
              { method: 'GET', endpoint: '/research/list', desc: 'Listar pesquisas' },
              { method: 'GET', endpoint: '/research/export/{id}', desc: 'Exportar dados' }
            ].map((api, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(0, 230, 118, 0.05)',
                  borderRadius: '0.5rem',
                  borderLeft: '3px solid #00E676'
                }}
              >
                <span style={{ background: '#00E676', color: '#003049', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', minWidth: '45px' }}>
                  {api.method}
                </span>
                <code style={{ color: '#00E676', fontSize: '0.875rem', flex: 1 }}>
                  {api.endpoint}
                </code>
                <span style={{ color: 'rgba(224, 247, 250, 0.6)', fontSize: '0.875rem' }}>
                  {api.desc}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ESTRUTURA DE DADOS */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="card-base mb-responsive"
        >
          <h2 style={{ color: '#00E676', marginBottom: '1.5rem' }}>📁 Estrutura de Armazenamento</h2>
          <pre style={{
            background: 'rgba(0, 48, 73, 0.6)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#00E676',
            fontSize: '0.875rem',
            overflowX: 'auto'
          }}>
{`data_lake/research/
├── {id}_data.csv
├── {id}_metadata.json
├── {id}_analysis.json
└── {id}_publication.json`}
          </pre>
        </motion.div>

        {/* IMPACTO */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid-2"
        >
          {[
            { title: '🧪 Experimentação', desc: 'Reprodutível e auditável' },
            { title: '🤖 GaiaMind AI', desc: 'Análise inteligente' },
            { title: '📚 Publicação', desc: 'Científica e verificável' },
            { title: '🌐 Rede', desc: 'Conhecimento compartilhado' }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="card-base"
              style={{ background: 'linear-gradient(to bottom right, rgba(0, 230, 118, 0.1), rgba(0, 230, 118, 0.05))' }}
            >
              <h3 style={{ color: '#00E676', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ color: 'rgba(224, 247, 250, 0.8)', fontSize: '0.875rem' }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ textAlign: 'center', marginTop: '2rem' }}
        >
          <button className="btn-responsive btn-primary" style={{ boxShadow: '0 0 30px rgba(0,230,118,0.3)' }}>
            Começar Experimentação
          </button>
        </motion.div>
      </div>
    </div>
  );
}
