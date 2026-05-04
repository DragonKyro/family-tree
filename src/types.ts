export type Gender = 'M' | 'F'

export interface PersonData {
  first_name: string
  last_name: string
  birthday?: string
  deathday?: string
  gender: Gender
  avatar?: string
  notes?: string
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
