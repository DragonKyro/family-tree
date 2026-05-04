import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FamilyTree } from './components/FamilyTree'
import { DetailsPanel } from './components/DetailsPanel'
import { SearchBox } from './components/SearchBox'
import { EditDialog } from './components/EditDialog'
import { LoginGate } from './components/LoginGate'
import {
  ApiError,
  AuthError,
  ConflictError,
  fetchFamily,
  findById,
  isSynthetic,
  updatePerson,
} from './lib/familyData'
import { clearPassword, getPassword } from './lib/auth'
import type { FamilyPayload, Person, PersonData } from './types'

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => Boolean(getPassword()))
  const [payload, setPayload] = useState<FamilyPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'error' } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    setToast({ message, tone })
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const p = await fetchFamily()
      setPayload(p)
      setLoadError(null)
    } catch (e) {
      if (e instanceof AuthError) {
        clearPassword()
        setAuthed(false)
        setPayload(null)
        return
      }
      setLoadError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    refresh()
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    }
  }, [authed, refresh])

  const handleSelect = useCallback((person: Person) => {
    if (isSynthetic(person)) return
    setSelectedId(person.id)
  }, [])

  const handleEdit = useCallback((person: Person) => {
    setEditingId(person.id)
  }, [])

  const handleSignOut = useCallback(() => {
    clearPassword()
    setAuthed(false)
    setPayload(null)
    setSelectedId(null)
    setEditingId(null)
  }, [])

  const handleSave = useCallback(
    async (id: string, edits: Partial<PersonData>) => {
      if (!payload) throw new Error('Data not loaded yet')
      try {
        const res = await updatePerson(id, edits, payload.version)
        setPayload({
          data: payload.data.map((p) => (p.id === id ? res.person : p)),
          version: res.version,
        })
        setEditingId(null)
        showToast('Saved.', 'info')
      } catch (e) {
        if (e instanceof AuthError) {
          handleSignOut()
          throw e
        }
        if (e instanceof ConflictError) {
          showToast(e.message, 'error')
          await refresh()
          throw e
        }
        if (e instanceof ApiError) {
          showToast(e.message, 'error')
          throw e
        }
        const msg = e instanceof Error ? e.message : 'Save failed'
        showToast(msg, 'error')
        throw e
      }
    },
    [payload, refresh, showToast, handleSignOut],
  )

  const selected = useMemo(
    () => (payload && selectedId ? findById(payload.data, selectedId) ?? null : null),
    [payload, selectedId],
  )
  const editing = useMemo(
    () => (payload && editingId ? findById(payload.data, editingId) ?? null : null),
    [payload, editingId],
  )

  if (!authed) {
    return <LoginGate onUnlock={() => setAuthed(true)} />
  }

  if (loadError) {
    return (
      <div className="app-error" role="alert">
        <p>Failed to load family tree: {loadError}</p>
        <button onClick={refresh}>Retry</button>
        <button onClick={handleSignOut}>Sign out</button>
      </div>
    )
  }
  if (!payload) {
    return <div className="app-loading">Loading family tree…</div>
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Lui + Shum Family Tree</h1>
        <div className="legend">
          <span className="legend-item"><span className="legend-swatch immediate" />Immediate</span>
          <span className="legend-item"><span className="legend-swatch lui" />Lui side</span>
          <span className="legend-item"><span className="legend-swatch shum" />Shum side</span>
          <span className="legend-item"><span className="legend-swatch marriage" />Marriage</span>
          <span className="legend-item"><span className="legend-swatch divorce" />Divorce</span>
        </div>
        <div className="spacer" />
        <SearchBox data={payload.data} onSelect={handleSelect} />
        <button type="button" className="signout-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </header>
      <main className="tree-area">
        <FamilyTree data={payload.data} onSelect={handleSelect} />
      </main>
      <DetailsPanel person={selected} data={payload.data} onSelect={handleSelect} onEdit={handleEdit} />
      {editing && (
        <EditDialog
          person={editing}
          onClose={() => setEditingId(null)}
          onSave={(edits) => handleSave(editing.id, edits)}
        />
      )}
      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status" onClick={() => setToast(null)}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
