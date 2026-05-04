import { useEffect, useRef, useState } from 'react'
import type { Person, PersonData } from '../types'
import { fullName, resolvePhotoUrl, uploadPhoto } from '../lib/familyData'

interface Props {
  person: Person
  onSave: (edits: Partial<PersonData>) => Promise<void>
  onClose: () => void
}

type FormState = {
  first_name: string
  last_name: string
  birthday: string
  deathday: string
  deceased: boolean
  phone: string
  email: string
  high_school: string
  high_school_grad_year: string
  college: string
  college_grad_year: string
  current_town: string
  current_job: string
  current_role: string
  interests: string
  notes: string
  avatar: string
}

function toForm(p: Person): FormState {
  const d = p.data
  return {
    first_name: d.first_name ?? '',
    last_name: d.last_name ?? '',
    birthday: d.birthday ?? '',
    deathday: d.deathday ?? '',
    deceased: Boolean(d.deceased),
    phone: d.phone ?? '',
    email: d.email ?? '',
    high_school: d.high_school ?? '',
    high_school_grad_year: d.high_school_grad_year ?? '',
    college: d.college ?? '',
    college_grad_year: d.college_grad_year ?? '',
    current_town: d.current_town ?? '',
    current_job: d.current_job ?? '',
    current_role: d.current_role ?? '',
    interests: d.interests ?? '',
    notes: d.notes ?? '',
    avatar: d.avatar ?? '',
  }
}

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp'
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function EditDialog({ person, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(person))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(toForm(person))
    setError(null)
  }, [person])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, saving])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Photo must be under ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const { path } = await uploadPhoto(file)
      update('avatar', path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = () => update('avatar', '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || uploading) return
    setSaving(true)
    setError(null)
    try {
      const edits: Partial<PersonData> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        birthday: form.birthday.trim(),
        deathday: form.deathday.trim(),
        deceased: form.deceased,
        phone: form.phone.trim(),
        email: form.email.trim(),
        high_school: form.high_school.trim(),
        high_school_grad_year: form.high_school_grad_year.trim(),
        college: form.college.trim(),
        college_grad_year: form.college_grad_year.trim(),
        current_town: form.current_town.trim(),
        current_job: form.current_job.trim(),
        current_role: form.current_role.trim(),
        interests: form.interests.trim(),
        notes: form.notes.trim(),
        avatar: form.avatar.trim(),
      }
      await onSave(edits)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || uploading

  return (
    <div className="dialog-backdrop" onMouseDown={() => !busy && onClose()}>
      <form className="dialog" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header className="dialog-header">
          <h2>Edit {fullName(person)}</h2>
          <button type="button" className="dialog-close" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </header>

        <div className="dialog-body">
          <Section title="Photo">
            <div className="photo-field">
              <div className="photo-preview">
                {form.avatar ? (
                  <img src={resolvePhotoUrl(form.avatar)} alt="" onError={() => setError('Photo failed to load')} />
                ) : (
                  <div className="photo-preview-empty">No photo</div>
                )}
              </div>
              <div className="photo-controls">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  style={{ display: 'none' }}
                  onChange={handleFilePick}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                >
                  {uploading ? 'Uploading…' : form.avatar ? 'Replace photo' : 'Upload photo'}
                </button>
                {form.avatar && (
                  <button type="button" onClick={handleRemovePhoto} disabled={busy}>
                    Remove
                  </button>
                )}
                <span className="dialog-field-hint">JPEG, PNG, GIF, or WebP · up to 5&nbsp;MB</span>
              </div>
            </div>
          </Section>

          <Section title="Name">
            <Field label="First name">
              <input
                type="text"
                maxLength={80}
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
              />
            </Field>
            <Field label="Last name">
              <input
                type="text"
                maxLength={80}
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Dates">
            <Field label="Birthday">
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => update('birthday', e.target.value)}
              />
            </Field>
            <Field label="Date of passing">
              <input
                type="date"
                value={form.deathday}
                onChange={(e) => update('deathday', e.target.value)}
              />
            </Field>
            <Field label="">
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={form.deceased}
                  onChange={(e) => update('deceased', e.target.checked)}
                />
                Deceased (shows † even without a date)
              </label>
            </Field>
          </Section>

          <Section title="Contact">
            <Field label="Phone" hint="10 or 11 digits; formatted on save">
              <input
                type="tel"
                maxLength={40}
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                maxLength={254}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="name@example.com"
              />
            </Field>
          </Section>

          <Section title="Education">
            <Field label="High school">
              <input
                type="text"
                maxLength={160}
                value={form.high_school}
                onChange={(e) => update('high_school', e.target.value)}
              />
            </Field>
            <Field label="HS grad year" hint="e.g. 2015">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={form.high_school_grad_year}
                onChange={(e) => update('high_school_grad_year', e.target.value)}
                placeholder="YYYY"
              />
            </Field>
            <Field label="College">
              <input
                type="text"
                maxLength={160}
                value={form.college}
                onChange={(e) => update('college', e.target.value)}
              />
            </Field>
            <Field label="College grad year" hint="e.g. 2019">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={form.college_grad_year}
                onChange={(e) => update('college_grad_year', e.target.value)}
                placeholder="YYYY"
              />
            </Field>
          </Section>

          <Section title="Work & life">
            <Field label="Current town">
              <input
                type="text"
                maxLength={120}
                value={form.current_town}
                onChange={(e) => update('current_town', e.target.value)}
              />
            </Field>
            <Field label="Current employer">
              <input
                type="text"
                maxLength={160}
                value={form.current_job}
                onChange={(e) => update('current_job', e.target.value)}
              />
            </Field>
            <Field label="Role / title">
              <input
                type="text"
                maxLength={160}
                value={form.current_role}
                onChange={(e) => update('current_role', e.target.value)}
              />
            </Field>
            <Field label="Interests / hobbies" hint="Comma-separated is fine">
              <textarea
                rows={2}
                maxLength={1000}
                value={form.interests}
                onChange={(e) => update('interests', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Notes">
            <Field label="">
              <textarea
                rows={3}
                maxLength={5000}
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
              />
            </Field>
          </Section>

          {error && <div className="dialog-error">{error}</div>}
        </div>

        <footer className="dialog-footer">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="dialog-section">
      <h3>{title}</h3>
      <div className="dialog-fields">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="dialog-field">
      {label && <span className="dialog-field-label">{label}</span>}
      {children}
      {hint && <span className="dialog-field-hint">{hint}</span>}
    </label>
  )
}
