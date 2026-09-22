import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Send, X } from 'lucide-react'
import { useLang } from '../../i18n.jsx'
import { api } from '../../api.js'
import { MathText } from '../../components/math.jsx'
import { getQuickPrompts } from './prompts.js'

const AUTO_COLLAPSE_MS = 45_000
const EMPTY_TURN = {
  mastery: 0,
  hint_level: 0,
  is_solved: false,
  action: null,
  asks_for_explanation: false,
}

export default function FloatingTutor({
  open, onOpen, onClose, topic, context, lang, studentId, classId, onActivity,
}) {
  const { t } = useLang()
  const [sid, setSid] = useState(null)
  const [messages, setMessages] = useState([])
  const [lastTurn, setLastTurn] = useState(EMPTY_TURN)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const collapseTimer = useRef(null)

  const problem = context.problem
  const hasProblem = !!problem

  const send = useCallback(async (text, sessionId = sid) => {
    const msg = (text ?? '').trim()
    if (!msg || !sessionId || sending) return
    setInput('')
    setMessages((current) => [...current, { role: 'user', content: msg, citations: [] }])
    setSending(true)
    try {
      const turn = await api.sendMessage(sessionId, msg, lang, { ...lastTurn, topic })
      setMessages((current) => [...current, {
        role: 'assistant', content: turn.tutor_message, citations: turn.citations || [],
      }])
      setLastTurn(turn)
      onActivity?.()
    } finally {
      setSending(false)
    }
  }, [lang, lastTurn, onActivity, sending, sid, topic])

  useEffect(() => {
    if (!topic) return undefined
    let alive = true
    setSid(null)
    setInput('')
    setMessages([{ role: 'assistant', content: t('tutor_welcome'), citations: [] }])
    setLastTurn(EMPTY_TURN)
    api.startSession({
      problem_id: problem?.id || null,
      condition: 'explain',
      student_id: studentId || 'anon',
      class_id: classId,
      topic,
      language: lang,
    }).then((res) => {
      if (!alive) return
      setSid(res.session_id)
      if (context.seed) setTimeout(() => send(context.seed, res.session_id), 120)
    })
    return () => { alive = false }
    // context.version intentionally starts a fresh conversation for practice actions.
  }, [context.version, lang, problem?.id, t, topic]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    if (!open) return undefined
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 180)
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open])

  const armAutoCollapse = useCallback(() => {
    clearTimeout(collapseTimer.current)
    if (!open || sending || input.trim()) return
    collapseTimer.current = setTimeout(onClose, AUTO_COLLAPSE_MS)
  }, [input, onClose, open, sending])

  useEffect(() => {
    armAutoCollapse()
    return () => clearTimeout(collapseTimer.current)
  }, [armAutoCollapse])

  const prompts = getQuickPrompts({
    topic,
    tutorEntry: context.entry,
    hasProblem,
    isSolved: lastTurn.is_solved,
    action: lastTurn.action,
    hintLevel: lastTurn.hint_level,
    asksForExplanation: lastTurn.asks_for_explanation,
  })

  return (
    <>
      {open && (
        <section id="floating-tutor" className="floating-tutor" role="dialog" aria-modal="false"
          aria-labelledby="floating-tutor-title" onPointerDown={armAutoCollapse} onKeyDown={armAutoCollapse}>
          <header className="floating-tutor-head">
            <span className="floating-tutor-avatar" aria-hidden="true"><Bot size={22} strokeWidth={2.2} /></span>
            <div className="floating-tutor-heading">
              <h2 id="floating-tutor-title">{t('tutor_heading')}</h2>
              <span>{hasProblem ? t('tutor_context_practice') : topic}</span>
            </div>
            <button className="floating-tutor-close" type="button" onClick={onClose}
              aria-label={t('tutor_close')} title={t('tutor_close')}>
              <X size={19} />
            </button>
          </header>

          <div className="floating-tutor-chat" ref={scrollRef} aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={'chat-msg ' + message.role}>
                <div className="chat-bubble">
                  <MathText>{message.content}</MathText>
                  {message.citations?.length > 0 && (
                    <div className="chat-cite">
                      {t('tutor_sources')}: {message.citations.map((citation) =>
                        `${citation.title}${citation.page != null ? ' p.' + citation.page : ''}`).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="chat-msg assistant"><div className="chat-bubble muted">{t('tutor_thinking')}</div></div>
            )}
          </div>

          {prompts.length > 0 && (
            <div className="floating-tutor-prompts">
              {prompts.map((prompt) => (
                <button key={prompt.key} className="chip" type="button" disabled={sending || !sid}
                  onClick={() => send(prompt.text)}>{t(prompt.labelKey)}</button>
              ))}
            </div>
          )}

          <form className="floating-tutor-input" onSubmit={(event) => { event.preventDefault(); send(input) }}>
            <textarea ref={inputRef} className="inp" rows={2} placeholder={t('tutor_input_ph')}
              value={input} onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send(input)
                }
              }} />
            <button className="floating-tutor-send" type="submit" disabled={sending || !sid || !input.trim()}
              aria-label={t('tutor_send')} title={t('tutor_send')}>
              <Send size={19} />
            </button>
          </form>
        </section>
      )}

      <button className={'floating-tutor-fab' + (open ? ' is-open' : '')} type="button"
        onClick={open ? onClose : onOpen} aria-expanded={open} aria-controls="floating-tutor"
        aria-label={open ? t('tutor_close') : t('tutor_open')} title={open ? t('tutor_close') : t('tutor_open')}>
        {open ? <X size={25} /> : <Bot size={28} strokeWidth={2.2} />}
        {!open && <span className="floating-tutor-pulse" aria-hidden="true" />}
      </button>
    </>
  )
}
