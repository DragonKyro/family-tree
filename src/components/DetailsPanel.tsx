import { useEffect, useState } from 'react'
import type {
  FamilyData,
  Person,
  Pronouns,
  Religion,
  RelationshipStatus,
  Sex,
  Sexuality,
  SocialPlatform,
} from '../types'
import { findById, fullName, resolvePhotoUrl } from '../lib/familyData'
import { formatDisplayDate, formatInterests, mailtoHref, telHref } from '../lib/formatters'
import { isSpeechAvailable, speakCantonese } from '../lib/speech'
import { getAgeText, getAstrology } from '../lib/astrology'
import { LightboxImage } from './LightboxImage'

interface SocialMeta {
  label: string
  emoji: string
  urlFor?: (handle: string) => string
}

const PRONOUN_EMOJI: Record<Pronouns, string> = {
  'he/him': '👨',
  'she/her': '👩',
  'they/them': '🧑',
  'he/they': '👨',
  'she/they': '👩',
  'any': '🧑',
}

const SEX_EMOJI: Record<Sex, string> = {
  male: '♂',
  female: '♀',
  intersex: '⚥',
}

const SEXUALITY_EMOJI: Record<Sexuality, string> = {
  straight: '❤️',
  gay: '🏳️‍🌈',
  lesbian: '🏳️‍🌈',
  bisexual: '🏳️‍🌈',
  pansexual: '🏳️‍🌈',
  asexual: '🏳️‍🌈',
  queer: '🏳️‍🌈',
}

const RELIGION_EMOJI: Record<Religion, string> = {
  Christian: '✝️',
  Catholic: '⛪',
  Buddhist: '☸️',
  Taoist: '☯️',
  Muslim: '☪️',
  Jewish: '✡️',
  Hindu: '🕉️',
  Sikh: '🪯',
  Atheist: '',
  Agnostic: '',
  None: '',
}

const RELATIONSHIP_EMOJI: Record<RelationshipStatus, string> = {
  single: '🧍',
  situationship: '💭',
  dating: '💞',
  engaged: '💍',
  married: '💒',
  divorced: '💔',
  widowed: '🕊️',
}

const SOCIAL_PLATFORMS: Array<{ key: SocialPlatform } & SocialMeta> = [
  { key: 'instagram', label: 'Instagram', emoji: '📷', urlFor: (h) => `https://instagram.com/${h}` },
  { key: 'facebook',  label: 'Facebook',  emoji: '👤', urlFor: (h) => `https://facebook.com/${h}` },
  { key: 'linkedin',  label: 'LinkedIn',  emoji: '💼', urlFor: (h) => `https://linkedin.com/in/${h}` },
  { key: 'twitter',   label: 'X',         emoji: '𝕏',  urlFor: (h) => `https://x.com/${h}` },
  { key: 'threads',   label: 'Threads',   emoji: '🧵', urlFor: (h) => `https://threads.net/@${h}` },
  { key: 'bluesky',   label: 'Bluesky',   emoji: '🦋', urlFor: (h) => `https://bsky.app/profile/${h}` },
  { key: 'tiktok',    label: 'TikTok',    emoji: '🎵', urlFor: (h) => `https://tiktok.com/@${h}` },
  { key: 'youtube',   label: 'YouTube',   emoji: '▶️', urlFor: (h) => `https://youtube.com/@${h}` },
  { key: 'snapchat',  label: 'Snapchat',  emoji: '👻', urlFor: (h) => `https://snapchat.com/add/${h}` },
  { key: 'github',    label: 'GitHub',    emoji: '💻', urlFor: (h) => `https://github.com/${h}` },
  { key: 'discord',   label: 'Discord',   emoji: '🎮' },
  { key: 'wechat',    label: 'WeChat',    emoji: '💬' },
]

interface Props {
  person: Person | null
  data: FamilyData
  onSelect: (person: Person) => void
  collapsed: boolean
  onToggleCollapse: () => void
  onClose?: () => void
}

export function DetailsPanel({ person, data, onSelect, collapsed, onToggleCollapse, onClose }: Props) {
  const [lightbox, setLightbox] = useState(false)

  // Close any open lightbox when the focused person changes.
  useEffect(() => {
    setLightbox(false)
  }, [person?.id])

  if (collapsed) {
    return (
      <aside className="side-panel side-panel-collapsed" aria-label="Info panel (collapsed)">
        <button
          type="button"
          className="panel-toggle"
          onClick={onToggleCollapse}
          aria-label="Expand info panel"
          title="Expand info panel"
        >
          ‹
        </button>
      </aside>
    )
  }

  if (!person) {
    return (
      <aside className="side-panel side-panel-empty">
        <button
          type="button"
          className="panel-toggle desktop-only"
          onClick={onToggleCollapse}
          aria-label="Collapse info panel"
          title="Collapse info panel"
        >
          ›
        </button>
        <p className="empty-state">Click a person in the tree to see details.</p>
      </aside>
    )
  }

  const father = person.rels.father ? findById(data, person.rels.father) : undefined
  const mother = person.rels.mother ? findById(data, person.rels.mother) : undefined
  const spouses = (person.rels.spouses ?? []).map((id) => findById(data, id)).filter(Boolean) as Person[]
  const children = (person.rels.children ?? []).map((id) => findById(data, id)).filter(Boolean) as Person[]
  const siblings = computeSiblings(data, person)

  const d = person.data
  const ageText = getAgeText(d)
  const astro = getAstrology(d.birthday)
  const subtitle = [dateRange(d), ageText, d.current_town && `📍 ${d.current_town}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <aside className="side-panel side-panel-has-person">
      <button
        type="button"
        className="panel-toggle desktop-only"
        onClick={onToggleCollapse}
        aria-label="Collapse info panel"
        title="Collapse info panel"
      >
        ›
      </button>
      {onClose && (
        <button
          type="button"
          className="panel-close mobile-only"
          onClick={onClose}
          aria-label="Close info panel"
          title="Close"
        >
          ✕
        </button>
      )}
      <div className="side-panel-top">
        <div className="side-panel-avatar">
          {d.avatar ? (
            <button
              type="button"
              className="avatar-button"
              onClick={() => setLightbox(true)}
              aria-label={`Enlarge photo of ${fullName(person)}`}
            >
              <img className="avatar" src={resolvePhotoUrl(d.avatar)} alt={fullName(person)} />
            </button>
          ) : (
            <div className="avatar avatar-placeholder" aria-hidden>
              {initials(person)}
            </div>
          )}
        </div>
        <div className="side-panel-title">
          <h2>{fullName(person)}</h2>
          {(d.nickname || d.chinese_name) && (
            <div className="muted name-aliases">
              {d.nickname && <span>"{d.nickname}"</span>}
              {d.nickname && d.chinese_name && ' · '}
              {d.chinese_name && (
                <>
                  <span lang="zh">{d.chinese_name}</span>
                  {isSpeechAvailable() && (
                    <button
                      type="button"
                      className="speak-btn"
                      onClick={() => speakCantonese(d.chinese_name!)}
                      aria-label={`Pronounce ${d.chinese_name}`}
                      title="Pronounce"
                    >
                      🔊
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {subtitle && <div className="muted">{subtitle}</div>}
        </div>
      </div>

      {(d.pronouns ||
        d.sex ||
        d.sexuality ||
        d.religion ||
        (d.languages && d.languages.length > 0) ||
        d.mbti ||
        d.relationship_status) && (
        <Section title="Personal">
          {d.pronouns && (
            <Row label="Pronouns">
              <span aria-hidden>{PRONOUN_EMOJI[d.pronouns]}</span> {d.pronouns}
            </Row>
          )}
          {d.sex && (
            <Row label="Sex">
              <span aria-hidden>{SEX_EMOJI[d.sex]}</span> {capitalize(d.sex)}
            </Row>
          )}
          {d.sexuality && (
            <Row label="Sexuality">
              <span aria-hidden>{SEXUALITY_EMOJI[d.sexuality]}</span> {capitalize(d.sexuality)}
            </Row>
          )}
          {d.religion && (
            <Row label="Religion">
              {RELIGION_EMOJI[d.religion] && (
                <>
                  <span aria-hidden>{RELIGION_EMOJI[d.religion]}</span>{' '}
                </>
              )}
              {d.religion}
            </Row>
          )}
          {d.languages && d.languages.length > 0 && (
            <Row label="Languages">
              <span aria-hidden>🗣️</span> {d.languages.join(', ')}
            </Row>
          )}
          {d.mbti && (
            <Row label="MBTI">
              <span aria-hidden>🧠</span> {d.mbti}
            </Row>
          )}
          {d.relationship_status && (
            <Row label="Status">
              <span aria-hidden>{RELATIONSHIP_EMOJI[d.relationship_status]}</span>{' '}
              {capitalize(d.relationship_status)}
            </Row>
          )}
        </Section>
      )}

      {astro && (
        <Section title="Born under">
          <Row label="Zodiac">
            <span aria-hidden>{astro.zodiacSymbol}</span> {astro.zodiacSign}
          </Row>
          <Row label="Chinese">
            <span aria-hidden>{astro.chineseZodiacEmoji}</span> {astro.chineseZodiac}
          </Row>
          <Row label="Element">
            <span aria-hidden>{astro.chineseElementEmoji}</span>{' '}
            {astro.chineseElement}
            <span className="muted-meta"> · {astro.chineseElementColor}</span>
          </Row>
          <Row label="Birthstone">
            <span aria-hidden>{astro.birthstoneEmoji}</span> {astro.birthstone}
          </Row>
        </Section>
      )}

      {(hasAny(d, ['phone', 'email']) || hasSocial(d.social)) && (
        <Section title="Contact">
          {d.phone && (
            <Row label={<><span aria-hidden>📞</span> Phone</>}>
              <a href={telHref(d.phone)}>{d.phone}</a>
            </Row>
          )}
          {d.email && (
            <Row label={<><span aria-hidden>✉️</span> Email</>}>
              <a href={mailtoHref(d.email)}>{d.email}</a>
            </Row>
          )}
          {SOCIAL_PLATFORMS.map((p) => {
            const raw = d.social?.[p.key]
            if (!raw) return null
            return (
              <Row key={p.key} label={<><span aria-hidden>{p.emoji}</span> {p.label}</>}>
                {renderSocialValue(raw, p.urlFor)}
              </Row>
            )
          })}
        </Section>
      )}

      {hasAny(d, [
        'high_school',
        'high_school_grad_year',
        'college',
        'college_grad_year',
        'college_degree',
        'grad_school',
        'grad_school_grad_year',
        'grad_school_degree',
      ]) && (
        <Section title="Education">
          {(d.high_school || d.high_school_grad_year) && (
            <Row label={<><span aria-hidden>🏫</span> High school</>}>
              {schoolLine(d.high_school, d.high_school_grad_year)}
            </Row>
          )}
          {(d.college || d.college_grad_year) && (
            <Row label={<><span aria-hidden>🎓</span> College</>}>
              {schoolLine(d.college, d.college_grad_year)}
            </Row>
          )}
          {d.college_degree && (
            <Row label={<><span aria-hidden>📜</span> Degree</>}>{d.college_degree}</Row>
          )}
          {(d.grad_school || d.grad_school_grad_year) && (
            <Row label={<><span aria-hidden>🎓</span> Grad school</>}>
              {schoolLine(d.grad_school, d.grad_school_grad_year)}
            </Row>
          )}
          {d.grad_school_degree && (
            <Row label={<><span aria-hidden>📜</span> Grad degree</>}>{d.grad_school_degree}</Row>
          )}
        </Section>
      )}

      {hasAny(d, ['current_job', 'current_role']) && (
        <Section title="Work">
          {d.current_job && (
            <Row label={<><span aria-hidden>🏢</span> Employer</>}>{d.current_job}</Row>
          )}
          {d.current_role && (
            <Row label={<><span aria-hidden>💼</span> Role</>}>{d.current_role}</Row>
          )}
        </Section>
      )}

      {d.interests && (
        <Section title="Interests">
          <div className="long-text">{formatInterests(d.interests)}</div>
        </Section>
      )}

      {(father || mother || spouses.length > 0 || children.length > 0 || siblings.length > 0) && (
        <Section title="Family">
          {father && (
            <Row label="Father">
              <PersonLink person={father} onSelect={onSelect} />
            </Row>
          )}
          {mother && (
            <Row label="Mother">
              <PersonLink person={mother} onSelect={onSelect} />
            </Row>
          )}
          {spouses.length > 0 && (
            <Row label={spouses.length > 1 ? 'Spouses' : 'Spouse'}>
              <PersonList people={spouses} onSelect={onSelect} />
            </Row>
          )}
          {siblings.length > 0 && (
            <Row label={siblings.length > 1 ? 'Siblings' : 'Sibling'}>
              <PersonList people={siblings} onSelect={onSelect} />
            </Row>
          )}
          {children.length > 0 && (
            <Row label={children.length > 1 ? 'Children' : 'Child'}>
              <PersonList people={children} onSelect={onSelect} />
            </Row>
          )}
        </Section>
      )}

      {d.notes && (
        <Section title="Notes">
          <div className="long-text">{d.notes}</div>
        </Section>
      )}

      {lightbox && d.avatar && (
        <LightboxImage
          src={resolvePhotoUrl(d.avatar) ?? d.avatar}
          alt={fullName(person)}
          onClose={() => setLightbox(false)}
        />
      )}
    </aside>
  )
}

function computeSiblings(data: FamilyData, person: Person): Person[] {
  const { father, mother } = person.rels
  if (!father && !mother) return []
  const seen = new Set<string>()
  const out: Person[] = []
  for (const p of data) {
    if (p.id === person.id) continue
    const sameF = father && p.rels.father === father
    const sameM = mother && p.rels.mother === mother
    if ((sameF || sameM) && !seen.has(p.id)) {
      seen.add(p.id)
      out.push(p)
    }
  }
  return out
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

function schoolLine(name: string | undefined, gradYear: string | undefined): string {
  if (name && gradYear) return `${name} · Class of ${gradYear}`
  if (name) return name
  if (gradYear) return `Class of ${gradYear}`
  return ''
}

function initials(p: Person): string {
  const f = p.data.first_name?.[0] ?? ''
  const l = p.data.last_name?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

function dateRange(d: Person['data']): string {
  const b = formatDisplayDate(d.birthday)
  const dd = formatDisplayDate(d.deathday)
  if (b && dd) return `${b} – ${dd}`
  if (b) return b
  if (dd) return `† ${dd}`
  if (d.deceased) return '†'
  return ''
}

function hasAny(d: Person['data'], keys: Array<keyof Person['data']>): boolean {
  return keys.some((k) => {
    const v = d[k]
    return typeof v === 'string' && v.length > 0
  })
}

function hasSocial(social: Person['data']['social']): boolean {
  if (!social) return false
  return Object.values(social).some((v) => typeof v === 'string' && v.length > 0)
}

function renderSocialValue(raw: string, urlFor?: (handle: string) => string) {
  const v = raw.trim()
  if (/^https?:\/\//i.test(v)) {
    return <a href={v} target="_blank" rel="noopener noreferrer">{v.replace(/^https?:\/\/(www\.)?/i, '')}</a>
  }
  const handle = v.replace(/^@/, '')
  if (!urlFor) return <span>{handle}</span>
  return <a href={urlFor(handle)} target="_blank" rel="noopener noreferrer">@{handle}</a>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel-section">
      <h3 className="panel-section-title">{title}</h3>
      <div className="panel-section-body">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="panel-row">
      <div className="panel-row-label">{label}</div>
      <div className="panel-row-value">{children}</div>
    </div>
  )
}

function PersonLink({ person, onSelect }: { person: Person; onSelect: (p: Person) => void }) {
  return (
    <button type="button" className="person-link" onClick={() => onSelect(person)}>
      {fullName(person)}
    </button>
  )
}

function PersonList({ people, onSelect }: { people: Person[]; onSelect: (p: Person) => void }) {
  return (
    <span className="person-list">
      {people.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ', '}
          <PersonLink person={p} onSelect={onSelect} />
        </span>
      ))}
    </span>
  )
}
