import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Send, X } from 'lucide-react'
import { useLang } from '../i18n.jsx'
import { api } from '../api.js'

const AUTO_COLLAPSE_MS = 45_000

const PROMPTS = {
  zh: ['哪个知识点最薄弱？', '学生的推理能力怎么样？', '接下来应该布置什么练习？', '总结当前班级情况'],
  en: ['Which topic is weakest?', 'How well are students reasoning?', 'What practice should I assign next?', 'Summarize this class'],
}

export default function FloatingTeacherAssistant({ open, onOpen, onClose, classId, classLabel }) {
  const { t, lang } = useLang()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const collapseTimer = useRef(null)

  useEffect(() => {
    setMessages([{ role: 'assistant', content: t('teacher_ai_welcome') }])
    setInput('')
  }, [classId, lang, t])

  const send = useCallback(async (text) => {
    const question = (text ?? input).trim()
    if (!question || sending) return
    setInput('')
    setMessages((current) => [...current, { role: 'user', content: question }])
    setSending(true)
    try {
      const result = await api.ask(question, lang, classId)
      setMessages((current) => [...current, {
        role: 'assistant', content: result.answer,
        note: result.llm_available ? '' : t('assistant_fallback'),
      }])
    } finally {
      setSending(false)
    }
  }, [classId, input, lang, sending, t])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    if (!open) return undefined
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 180)
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
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

  return (
    <>
      {open && (
        <section id="teacher-data-assistant" className="floating-tutor" role="dialog" aria-modal="false"
          aria-labelledby="teacher-data-assistant-title" onPointerDown={armAutoCollapse} onKeyDown={armAutoCollapse}>
          <header className="floating-tutor-head">
            <span className="floating-tutor-avatar" aria-hidden="true"><Bot size={22} strokeWidth={2.2} /></span>
            <div className="floating-tutor-heading">
              <h2 id="teacher-data-assistant-title">{t('teacher_ai_title')}</h2>
              <span>{classLabel}</span>
            </div>
            <button className="floating-tutor-close" type="button" onClick={onClose}
              aria-label={t('teacher_ai_close')} title={t('teacher_ai_close')}><X size={19} /></button>
          </header>

          <div className="floating-tutor-chat" ref={scrollRef} aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={'chat-msg ' + message.role}>
                <div className="chat-bubble">
                  {message.note && <div className="chat-note">{message.note}</div>}
                  {message.content}
                </div>
              </div>
            ))}
            {sending && <div className="chat-msg assistant"><div className="chat-bubble muted">{t('assistant_thinking')}</div></div>}
          </div>

          <div className="floating-tutor-prompts">
            {PROMPTS[lang].map((prompt) => (
              <button key={prompt} className="chip" type="button" disabled={sending}
                onClick={() => send(prompt)}>{prompt}</button>
            ))}
          </div>

          <form className="floating-tutor-input" onSubmit={(event) => { event.preventDefault(); send(input) }}>
            <textarea ref={inputRef} className="inp" rows={2} placeholder={t('teacher_ai_placeholder')}
              value={input} onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send(input)
                }
              }} />
            <button className="floating-tutor-send" type="submit" disabled={sending || !input.trim()}
              aria-label={t('assistant_send')} title={t('assistant_send')}><Send size={19} /></button>
          </form>
        </section>
      )}

      <button className={'floating-tutor-fab' + (open ? ' is-open' : '')} type="button"
        onClick={open ? onClose : onOpen} aria-expanded={open} aria-controls="teacher-data-assistant"
        aria-label={open ? t('teacher_ai_close') : t('teacher_ai_open')}
        title={open ? t('teacher_ai_close') : t('teacher_ai_open')}>
        {open ? <X size={25} /> : <Bot size={28} strokeWidth={2.2} />}
        {!open && <span className="floating-tutor-pulse" aria-hidden="true" />}
      </button>
    </>
  )
}
