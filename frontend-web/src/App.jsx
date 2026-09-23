import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { ClipboardPlus, GraduationCap, LayoutDashboard, Moon, School, Sun } from 'lucide-react'
import { useLang } from './i18n.jsx'
import Overview from './pages/Overview.jsx'
import Assign from './pages/Assign.jsx'
import FloatingTeacherAssistant from './pages/FloatingTeacherAssistant.jsx'
import StudentApp from './pages/StudentApp.jsx'
import { api } from './api.js'
import { TeacherClassContext } from './components/TeacherClass.jsx'

const NAV = [
  { to: '/overview', key: 'nav_overview', icon: LayoutDashboard },
  { to: '/assign', key: 'nav_assign', icon: ClipboardPlus },
]

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])
  return [theme, setTheme]
}

const TITLES = {
  '/overview': 'overview_title',
  '/assign': 'assign_title',
}

/* Shared footer controls: role switch + theme + language. */
function ShellControls({ role, setRole, theme, setTheme }) {
  const { t, lang, setLang } = useLang()
  return (
    <>
      <div className="divider" />
      <div className="role-switch">
        <button className={'role-btn' + (role === 'teacher' ? ' active' : '')} onClick={() => setRole('teacher')}>
          <School size={15} /> {t('role_teacher')}
        </button>
        <button className={'role-btn' + (role === 'student' ? ' active' : '')} onClick={() => setRole('student')}>
          <GraduationCap size={15} /> {t('role_student')}
        </button>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
          <span className="theme-label-icon" aria-hidden="true">{theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}</span>
          {theme === 'dark' ? t('theme_dark') : t('theme_light')}
        </span>
        <button className={'switch' + (theme === 'dark' ? ' on' : '')}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="toggle theme" />
      </div>
      <div className="row" style={{ gap: 6 }}>
        {['zh', 'en'].map((l) => (
          <button key={l} className="chip" onClick={() => setLang(l)}
            style={lang === l ? { borderColor: 'var(--brand-300)', color: 'var(--brand-700)', background: 'var(--brand-50)' } : {}}>
            {l === 'zh' ? '中文' : 'EN'}
          </button>
        ))}
      </div>
    </>
  )
}

export default function App() {
  const [role, setRole] = useState(() => localStorage.getItem('role') || 'teacher')
  const [theme, setTheme] = useTheme()
  const setRoleP = (r) => { setRole(r); localStorage.setItem('role', r) }

  const controls = <ShellControls role={role} setRole={setRoleP} theme={theme} setTheme={setTheme} />

  if (role === 'student') return <StudentApp topbar={controls} />
  return <TeacherApp controls={controls} />
}

function TeacherApp({ controls }) {
  const { t, lang } = useLang()
  const [classId, setClassId] = useState('')
  const [classes, setClasses] = useState([])
  const [assistantOpen, setAssistantOpen] = useState(false)
  useEffect(() => { api.getClasses().then(res => setClasses(Array.isArray(res) ? res : res.classes || [])) }, [])
  const loc = useLocation()
  const titleKey = TITLES[loc.pathname] || 'app_title'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">∫</div>
          <div>
            <div className="brand-name">{t('app_title')}</div>
            <div className="brand-sub">{t('app_sub')}</div>
          </div>
        </div>

        <div className="workspace-kicker">{lang === 'zh' ? '教师工作台' : 'TEACHER WORKSPACE'}</div>

        <div className="nav-group-label">{t('nav_group_main')}</div>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span className="ctrl-label">{lang === 'zh' ? '当前班级' : 'Current class'}</span>
          <select className="inp" value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">{lang === 'zh' ? '全部记录（含未分班）' : 'All records (including unassigned)'}</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="ic"><n.icon size={18} strokeWidth={2} /></span>{t(n.key)}
          </NavLink>
        ))}

        <div className="sidebar-foot">{controls}</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="crumb">{t('app_sub')}</div>
            <h1>{t(titleKey)}</h1>
          </div>
          <div className="topbar-spacer" />
        </header>

        <TeacherClassContext.Provider value={classId}>
        <div className="content" key={loc.pathname + classId}>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/assign" element={<Assign />} />
            <Route path="/diagnose" element={<Navigate to="/overview" replace />} />
            <Route path="/assistant" element={<Navigate to="/overview" replace />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </div>
        </TeacherClassContext.Provider>
      </main>
      <FloatingTeacherAssistant open={assistantOpen}
        onOpen={() => setAssistantOpen(true)} onClose={() => setAssistantOpen(false)}
        classId={classId} classLabel={classes.find((item) => item.id === classId)?.label || t('teacher_ai_all_classes')} />
    </div>
  )
}
