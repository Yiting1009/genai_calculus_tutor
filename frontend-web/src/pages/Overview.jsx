import { displayLabel } from '../localization.js'
import { useNavigate } from 'react-router-dom'
import { ClipboardPlus, Target } from 'lucide-react'
import { useLang } from '../i18n.jsx'
import { useAnalytics } from '../components/hooks.js'
import { Card, Kpi, Bar, Loading, MockPill, Empty } from '../components/ui.jsx'

export default function Overview() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const { loading, data, error, reload } = useAnalytics()

  if (loading) return <Loading rows={2} />
  if (error) return (
    <Card>
      <div className="empty">
        <div className="ico">⚠️</div>{t('error_load')}
        <div style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={reload}>{t('retry')}</button>
        </div>
      </div>
    </Card>
  )

  const k = data.kpis || {}
  const rMax = k.reasoning_score_max || data.reasoning_max || 4
  const topics = [...(data.by_topic || [])]
    .filter((item) => (item.attempts || 0) > 0)
    .sort((a, b) => (a.accuracy - b.accuracy) || (a.reasoning - b.reasoning))
    .slice(0, 3)

  const assignTopic = (topic) => navigate(`/assign?topic=${encodeURIComponent(topic)}`)

  return (
    <div className="stack fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="muted" style={{ margin: 0 }}>{t('overview_sub')}</p>
        <MockPill show={data._mock} />
      </div>

      <div className="grid cols-3 teacher-kpis">
        <Kpi label={t('kpi_students')}  value={k.active_students ?? 0} delta={k.active_students_delta} sub={t('kpi_students_sub')} />
        <Kpi label={t('kpi_accuracy')}  value={((k.avg_accuracy ?? 0) * 100).toFixed(0)} unit="%" delta={k.avg_accuracy_delta} sub={t('kpi_solve_sub')} />
        <Kpi label={t('kpi_reasoning')} value={(k.reasoning_score ?? 0).toFixed(1)} unit={`/${rMax}`} delta={k.reasoning_score_delta} sub={t('kpi_reasoning_sub')} />
      </div>

      <Card title={t('teacher_attention_title')} icon={<Target size={18} />}
        sub={t('teacher_attention_sub')} right={topics.length > 0 && <span className="attention-count">{topics.length}</span>}>
        {topics.length === 0 ? <Empty icon="✓">{t('teacher_attention_empty')}</Empty> : (
          <div className="attention-list">
            {topics.map((row, index) => (
              <div className="attention-row" key={row.topic}>
                <div className="attention-rank">{index + 1}</div>
                <div className="attention-topic">
                  <strong>{displayLabel(row.topic, lang)}</strong>
                  <span>{t('teacher_attempts').replace('{n}', row.attempts ?? 0)}</span>
                </div>
                <div className="attention-metric">
                  <div className="attention-metric-head">
                    <span>{t('teacher_topic_accuracy')}</span><strong>{Math.round((row.accuracy || 0) * 100)}%</strong>
                  </div>
                  <Bar value={row.accuracy || 0} />
                </div>
                <div className="attention-reasoning">
                  <span>{t('kpi_reasoning')}</span>
                  <strong>{(row.reasoning ?? 0).toFixed(1)}/{rMax}</strong>
                </div>
                <button className="btn sm" onClick={() => assignTopic(row.topic)}>
                  <ClipboardPlus size={16} />{t('teacher_assign_action')}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
