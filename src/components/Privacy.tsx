import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Download, Trash2, ChevronDown, ChevronUp, Lock, Eye, Database, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../services/apiBaseConfig';

const getAuthHeaders = () => {
  try {
    const saved = localStorage.getItem('gaiamind-auth');
    const token = saved ? JSON.parse(saved).token : null;
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
};

const icons = [Database, Eye, UserCheck, Lock, Shield, Lock];

export function Privacy() {
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const sections: { title: string; content: string }[] = t('privacy.sections', { returnObjects: true }) as any;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/privacy/my-data`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GaiaMind_MyData_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ text: t('privacy.export_success'), type: 'success' });
    } catch {
      setMessage({ text: t('privacy.export_error'), type: 'error' });
    } finally {
      setExporting(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/privacy/my-data`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessage({ text: t('privacy.delete_success', { count: data.deleted_conversations }), type: 'success' });
      setConfirmDelete(false);
    } catch {
      setMessage({ text: t('privacy.delete_error'), type: 'error' });
    } finally {
      setDeleting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'clamp(1rem,3vw,1.5rem)' }}>
        <Shield size={20} style={{ color: '#00E676', flexShrink: 0 }} />
        <div>
          <p style={{ color: '#e0f7fa', fontWeight: 600, fontSize: 'clamp(0.85rem,2.5vw,1rem)', margin: 0 }}>{t('privacy.title')}</p>
          <p style={{ color: 'rgba(224,247,250,0.5)', fontSize: 'clamp(0.7rem,1.8vw,0.8rem)', margin: 0 }}>{t('privacy.subtitle', 'Gerencie os seus dados de conversas')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: 'clamp(1rem,3vw,1.5rem)' }}>
        <button onClick={handleExport} disabled={exporting}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: 'clamp(0.5rem,1.5vw,0.625rem) clamp(0.875rem,2.5vw,1.25rem)', borderRadius: '0.5rem', border: '1px solid rgba(0,230,118,0.4)', background: 'rgba(0,230,118,0.1)', color: '#00E676', cursor: 'pointer', fontWeight: 600, fontSize: 'clamp(0.8rem,2vw,0.875rem)', minHeight: 44, opacity: exporting ? 0.6 : 1 }}>
          <Download size={15} />
          {exporting ? t('privacy.exporting') : t('privacy.export')}
        </button>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: 'clamp(0.5rem,1.5vw,0.625rem) clamp(0.875rem,2.5vw,1.25rem)', borderRadius: '0.5rem', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer', fontWeight: 600, fontSize: 'clamp(0.8rem,2vw,0.875rem)', minHeight: 44 }}>
            <Trash2 size={15} />
            {t('privacy.delete')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={handleDelete} disabled={deleting}
              style={{ display: 'inline-flex', alignItems: 'center', padding: 'clamp(0.5rem,1.5vw,0.625rem) clamp(0.875rem,2.5vw,1.25rem)', borderRadius: '0.5rem', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 'clamp(0.8rem,2vw,0.875rem)', minHeight: 44, opacity: deleting ? 0.6 : 1 }}>
              {deleting ? t('privacy.deleting') : t('privacy.confirm_delete')}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ display: 'inline-flex', alignItems: 'center', padding: 'clamp(0.5rem,1.5vw,0.625rem) clamp(0.875rem,2.5vw,1.25rem)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', minHeight: 44, fontSize: 'clamp(0.8rem,2vw,0.875rem)' }}>
              {t('privacy.cancel')}
            </button>
          </div>
        )}
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: 'clamp(0.5rem,1.5vw,0.75rem) 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: message.type === 'success' ? 'rgba(0,230,118,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${message.type === 'success' ? 'rgba(0,230,118,0.4)' : 'rgba(239,68,68,0.4)'}`, color: message.type === 'success' ? '#00E676' : '#f87171', fontSize: 'clamp(0.75rem,2vw,0.875rem)' }}>
          {message.text}
        </motion.div>
      )}

      {Array.isArray(sections) && sections.map((section, i) => {
        const Icon = icons[i] || Shield;
        const isOpen = openSection === i;
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ marginBottom: '0.5rem', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '0.5rem', overflow: 'hidden', background: 'rgba(0,48,73,0.4)' }}>
            <button onClick={() => setOpenSection(isOpen ? null : i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(0.625rem,2vw,0.875rem) clamp(0.75rem,2.5vw,1.25rem)', background: 'none', border: 'none', cursor: 'pointer', color: '#e0f7fa', textAlign: 'left', minHeight: 44 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon style={{ width: '1rem', height: '1rem', color: '#00E676', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 'clamp(0.8rem,2vw,0.9rem)' }}>{section.title}</span>
              </div>
              {isOpen ? <ChevronUp style={{ width: '1rem', height: '1rem', color: '#00E676' }} /> : <ChevronDown style={{ width: '1rem', height: '1rem', color: 'rgba(224,247,250,0.4)' }} />}
            </button>
            {isOpen && (
              <div style={{ padding: '0 clamp(0.75rem,2.5vw,1.25rem) clamp(0.625rem,2vw,1rem)', color: 'rgba(224,247,250,0.75)', fontSize: 'clamp(0.75rem,2vw,0.875rem)', lineHeight: 1.7, borderTop: '1px solid rgba(0,230,118,0.1)' }}>
                <p style={{ marginTop: '0.75rem' }}>{section.content}</p>
              </div>
            )}
          </motion.div>
        );
      })}

      <p style={{ textAlign: 'center', marginTop: 'clamp(1rem,3vw,1.5rem)', color: 'rgba(224,247,250,0.35)', fontSize: 'clamp(0.65rem,1.5vw,0.75rem)' }}>
        {t('privacy.footer')}
      </p>
    </div>
  );
}
