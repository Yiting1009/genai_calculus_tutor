import { ArrowRight, Route } from 'lucide-react'
import { useLang } from '../../i18n.jsx'

export default function LearningRecommendation({ recommendation, loading, onStart }) {
  const { t, lang } = useLang()
  if (loading && !recommendation) {
    return <div className="learning-recommendation is-loading" aria-label={t('learning_path_loading')} />
  }
  if (!recommendation) return null

  const evidence = []
  if (recommendation.attempts > 0) evidence.push(t('learning_path_attempts').replace('{n}', recommendation.attempts))
  if (recommendation.accuracy != null) evidence.push(t('learning_path_accuracy').replace('{n}', Math.round(recommendation.accuracy * 100)))
  if (recommendation.reasoning != null) evidence.push(t('learning_path_reasoning').replace('{n}', recommendation.reasoning.toFixed(1)))

  return (
    <section className="learning-recommendation" aria-labelledby="learning-recommendation-title">
      <span className="learning-recommendation-icon" aria-hidden="true"><Route size={21} /></span>
      <div className="learning-recommendation-copy">
        <div className="learning-recommendation-eyebrow">{t('learning_path_next')}</div>
        <h2 id="learning-recommendation-title">{recommendation.topic}</h2>
        <p>{lang === 'zh' ? recommendation.reason_zh : recommendation.reason_en}</p>
        {evidence.length > 0 && <div className="learning-recommendation-evidence">{evidence.join(' · ')}</div>}
      </div>
      <button className="btn primary learning-recommendation-action" type="button" onClick={() => onStart(recommendation)}>
        {t('learning_path_start')}<ArrowRight size={16} />
      </button>
    </section>
  )
}
