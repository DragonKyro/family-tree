export type Gender = 'M' | 'F'

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'snapchat'
  | 'github'
  | 'discord'
  | 'threads'
  | 'bluesky'
  | 'wechat'

export type SocialHandles = Partial<Record<SocialPlatform, string>>

export type RelationshipStatus =
  | 'single'
  | 'situationship'
  | 'dating'
  | 'engaged'
  | 'married'
  | 'divorced'
  | 'widowed'

export type Pronouns =
  | 'he/him'
  | 'she/her'
  | 'they/them'
  | 'he/they'
  | 'she/they'
  | 'any'

export type Sex = 'male' | 'female' | 'intersex'

export type Religion =
  | 'Christian'
  | 'Catholic'
  | 'Buddhist'
  | 'Taoist'
  | 'Muslim'
  | 'Jewish'
  | 'Hindu'
  | 'Sikh'
  | 'Atheist'
  | 'Agnostic'
  | 'None'

export type MBTI =
  | 'ISTJ' | 'ISFJ' | 'INFJ' | 'INTJ'
  | 'ISTP' | 'ISFP' | 'INFP' | 'INTP'
  | 'ESTP' | 'ESFP' | 'ENFP' | 'ENTP'
  | 'ESTJ' | 'ESFJ' | 'ENFJ' | 'ENTJ'

export type Sexuality =
  | 'straight'
  | 'gay'
  | 'lesbian'
  | 'bisexual'
  | 'pansexual'
  | 'asexual'
  | 'queer'

export interface PersonData {
  first_name: string
  last_name: string
  birthday?: string
  deathday?: string
  /** Wedding date — set on each spouse (denormalized). YYYY-MM-DD. */
  wedding_date?: string
  deceased?: boolean
  divorced?: boolean
  is_pet?: boolean
  gender: Gender
  avatar?: string
  notes?: string
  branch?: 'immediate' | 'lui' | 'shum' | 'placeholder'

  phone?: string
  email?: string
  high_school?: string
  high_school_grad_year?: string
  college?: string
  college_grad_year?: string
  college_degree?: string
  grad_school?: string
  grad_school_grad_year?: string
  grad_school_degree?: string
  current_town?: string
  /** Optional pre-set [lat, lng] — overrides geocoding `current_town`. */
  coords?: [number, number]
  current_job?: string
  current_role?: string
  interests?: string
  chinese_name?: string
  nickname?: string
  languages?: string[]
  religion?: Religion
  pronouns?: Pronouns
  sex?: Sex
  sexuality?: Sexuality
  mbti?: MBTI
  relationship_status?: RelationshipStatus
  social?: SocialHandles

  [key: string]: unknown
}

export interface PersonRels {
  father?: string
  mother?: string
  spouses?: string[]
  children?: string[]
}

export interface Person {
  id: string
  data: PersonData
  rels: PersonRels
  main?: boolean
}

export type FamilyData = Person[]
