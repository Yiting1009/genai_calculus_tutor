import { useEffect, useState } from 'react'
import { useLang } from '../i18n.jsx'
import { api } from '../api.js'
import Concept from './student/Concept.jsx'
import Practice from './student/Practice.jsx'
import FloatingTutor from './student/FloatingTutor.jsx'
import Favorites from './student/Favorites.jsx'
import LearningRecommendation from './student/LearningRecommendation.jsx'
import { PRESETS } from './student/prompts.js'
import { prefetchQuestion } from './student/questionCache.js'
import { BookOpen, ChevronDown, ListTree, PenLine, Star } from 'lucide-react'

const STAGES = [
  { key: 'concept',  Icon: BookOpen, labelKey: 'stage_concept',  hintKey: 'stage_concept_hint' },
  { key: 'practice', Icon: PenLine, labelKey: 'stage_practice', hintKey: 'stage_practice_hint' },
]

function getGuestFavoriteId() {
  const stored = localStorage.getItem('stu_favorite_guest_id')
  if (stored) return stored
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const id = `guest-${suffix}`
  localStorage.setItem('stu_favorite_guest_id', id)
  return id
}

export default function StudentApp({ topbar }) {
  const { t, lang } = useLang()

  // identity
  const [studentId, setStudentId] = useState(() => localStorage.getItem('stu_name') || '')
  const [classId, setClassId] = useState('')
  const [classes, setClasses] = useState([])

  // catalog / topic
  const [catalog, setCatalog] = useState(null)
  const [topic, setTopic] = useState('')

  // learning flow
  const [view, setView] = useState('learning')   // 'learning' | 'favorites'
  const [stage, setStage] = useState('concept')   // 'concept' | 'practice'
  const [difficulty, setDifficulty] = useState('easy')
  const [qtype, setQtype] = useState('single_choice')
  const [catalogOpen, setCatalogOpen] = useState(false)

  // floating tutor context
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantContext, setAssistantContext] = useState({
    entry: 'concept', problem: null, seed: null, version: 0,
  })

  // favorites
  const [guestFavoriteId] = useState(getGuestFavoriteId)
  const [favorites, setFavorites] = useState([])
  const [favoriteError, setFavoriteError] = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [learningRevision, setLearningRevision] = useState(0)
  const favoriteOwnerId = studentId.trim() || guestFavoriteId

  useEffect(() => {
    api.getClasses().then((r) => {
      const list = r.classes || []
      setClasses(list)
      setClassId((c) => c || list[0]?.id || '')
    })
    api.getCatalog().then((c) => {
      setCatalog(c)
      const first = c.chapters?.[0]?.sections?.[0]?.title
      if (first) setTopic((tp) => tp || first)
    })
  }, [])

  useEffect(() => {
    if (!topic) return
    prefetchQuestion({ topic, type: qtype, difficulty, language: lang })
  }, [topic, qtype, difficulty, lang])

  useEffect(() => {
    if (!topic || !classId || !favoriteOwnerId) return undefined
    let active = true
    setRecommendationLoading(true)
    api.getLearningRecommendation(favoriteOwnerId, classId, topic)
      .then((result) => { if (active) setRecommendation(result) })
      .catch(() => { if (active) setRecommendation(null) })
      .finally(() => { if (active) setRecommendationLoading(false) })
    return () => { active = false }
  }, [classId, favoriteOwnerId, learningRevision, topic])

  useEffect(() => {
    let active = true
    setFavoriteError('')
    api.getFavorites(favoriteOwnerId)
      .then((r) => { if (active) setFavorites(r.favorites || []) })
      .catch(() => {
        if (!active) return
        setFavorites([])
        setFavoriteError(t('fav_load_error'))
      })
    return () => { active = false }
  }, [favoriteOwnerId, t])

  const saveName = (v) => { setStudentId(v); localStorage.setItem('stu_name', v) }

  // ----- stage transitions -----
  const goConcept = () => { setStage('concept'); setView('learning') }
  const goPractice = () => { setStage('practice'); setView('learning') }
  const goTutor = (entry, { problem = null, seed = null } = {}) => {
    setAssistantContext((current) => ({ entry, problem, seed, version: current.version + 1 }))
    setAssistantOpen(true)
  }

  const pickTopic = (title) => {
    setTopic(title); setStage('concept'); setView('learning')
    setCatalogOpen(false)
    setAssistantContext((current) => ({
      entry: 'concept', problem: null, seed: null, version: current.version + 1,
    }))
  }

  // ----- favorites -----
  const toggleFavorite = async (q, isFav) => {
    setFavoriteError('')
    try {
      if (isFav) {
        await api.deleteFavorite(q.id, favoriteOwnerId)
        setFavorites((f) => f.filter((x) => x.question_id !== q.id))
      } else {
        const saved = await api.addFavorite({
          student_id: favoriteOwnerId, class_id: classId, question_id: q.id,
        })
        setFavorites((f) => [saved, ...f.filter((x) => x.question_id !== q.id)])
      }
      return true
    } catch {
      setFavoriteError(t('fav_save_error'))
      return false
    }
  }
  const removeFavorite = async (qid) => {
    setFavoriteError('')
    try {
      await api.deleteFavorite(qid, favoriteOwnerId)
      setFavorites((f) => f.filter((x) => x.question_id !== qid))
    } catch {
      setFavoriteError(t('fav_remove_error'))
    }
  }
  const practiceFavorite = (f) => { setTopic(f.topic); setQtype(f.type); setDifficulty(f.difficulty); goPractice() }
  const startRecommendation = (next) => {
    setTopic(next.topic)
    setDifficulty(next.difficulty)
    setQtype(next.qtype)
    setStage('practice')
    setView('learning')
  }

  const stageIndex = STAGES.findIndex((s) => s.key === stage)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">∫</div>
          <div>
            <div className="brand-name">{t('stu_app_title')}</div>
            <div className="brand-sub">{t('stu_app_sub')}</div>
          </div>
        </div>

        <div className="workspace-kicker">{lang === 'zh' ? '学生学习空间' : 'STUDENT WORKSPACE'}</div>

        <div className="stu-field">
          <label className="ctrl-label">{t('stu_name')}</label>
          <input className="inp" placeholder={t('stu_name_ph')} value={studentId} onChange={(e) => saveName(e.target.value)} />
        </div>
        <div className="stu-field">
          <label className="ctrl-label">{t('stu_class')}</label>
          <select className="inp" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <button className={'nav-item' + (view === 'favorites' ? ' active' : '')} style={{ marginTop: 6 }}
          onClick={() => setView('favorites')}>
          <span className="ic"><Star size={18} /></span>{t('stu_favorites')}
          {favorites.length > 0 && <span className="fav-count">{favorites.length}</span>}
        </button>

        <div className="nav-group-label catalog-label">{t('stu_catalog')}</div>
        <button className="mobile-catalog-toggle" type="button" aria-expanded={catalogOpen}
          onClick={() => setCatalogOpen((value) => !value)}>
          <ListTree size={17} />
          <span>{t('stu_catalog')}</span>
          <strong>{topic}</strong>
          <ChevronDown size={17} className={catalogOpen ? 'is-open' : ''} />
        </button>
        <div className={'catalog-scroll' + (catalogOpen ? ' mobile-open' : '')}>
          {(catalog?.chapters || []).map((ch) => (
            <div key={ch.id} className="cat-chapter">
              <div className="cat-chapter-title">{ch.title}</div>
              {ch.sections.map((sec) => (
                <button key={sec.id} className={'cat-sec' + (topic === sec.title && view === 'learning' ? ' active' : '')}
                  onClick={() => pickTopic(sec.title)}>
                  {sec.label && <span className="cat-sec-label">{sec.label}</span>}{sec.title}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-foot">{topbar}</div>
      </aside>

      <main className="main">
        <div className="content">
          {view === 'favorites' ? (
            <Favorites favorites={favorites} error={favoriteError}
              onRemove={removeFavorite} onPractice={practiceFavorite} onBack={goConcept} />
          ) : (
            <>
              <LearningRecommendation recommendation={recommendation} loading={recommendationLoading}
                onStart={startRecommendation} />
              {/* stepper */}
              <div className="stepper">
                {STAGES.map((s, i) => (
                  <button key={s.key} className={'step' + (s.key === stage ? ' active' : '') + (i < stageIndex ? ' done' : '')}
                    onClick={() => setStage(s.key)}>
                    <span className="step-ic"><s.Icon size={18} strokeWidth={2} /></span>
                    <span className="step-label">{t(s.labelKey)}</span>
                  </button>
                ))}
              </div>
              <div className="stepper-hint muted">{t(STAGES[stageIndex]?.hintKey)}</div>

              {stage === 'concept' && topic && (
                <Concept topic={topic} onStartPractice={goPractice} />
              )}
              {stage === 'practice' && (
                <Practice topic={topic} difficulty={difficulty} qtype={qtype}
                  setDifficulty={setDifficulty} setQtype={setQtype}
                  studentId={favoriteOwnerId} classId={classId} lang={lang}
                  onActivity={() => setLearningRevision((value) => value + 1)}
                  favorites={favorites} favoriteError={favoriteError} onToggleFavorite={toggleFavorite}
                  onBackConcept={goConcept}
                  onStuck={(q) => goTutor('practice', { problem: toProblem(q), seed: PRESETS.im_stuck() })}
                  onExplainCorrect={(q) => goTutor('practice', { problem: toProblem(q), seed: PRESETS.my_reasoning() })}
                  onGetHint={(q) => goTutor('practice', { problem: toProblem(q), seed: PRESETS.hint_first() })}
                  onFirstStep={(q) => goTutor('practice', { problem: toProblem(q), seed: PRESETS.im_stuck() })} />
              )}
            </>
          )}
        </div>
      </main>
      <FloatingTutor open={assistantOpen} onOpen={() => setAssistantOpen(true)} onClose={() => setAssistantOpen(false)}
        topic={topic} context={assistantContext} lang={lang} studentId={favoriteOwnerId} classId={classId}
        onActivity={() => setLearningRevision((value) => value + 1)} />
    </div>
  )
}

function toProblem(q) {
  if (!q) return null
  return { id: q.id, statement: q.stem, topic: q.topic, difficulty: q.difficulty }
}
