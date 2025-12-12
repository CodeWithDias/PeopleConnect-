export enum RelationshipType {
  FRIEND = 'Friend',
  COLLEAGUE = 'Colleague',
  CLIENT = 'Client',
  FAMILY = 'Family',
  MENTOR = 'Mentor',
  OTHER = 'Other'
}

export interface Note {
  id: string;
  date: string; // ISO string
  content: string;
}

export interface Relationship {
  targetId: string;
  type: string;
  note?: string; // New field for relationship specific notes
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  country: string;
  institute: string;
  linkedin?: string; // New field
  specialInfo?: string; // New field
  photo?: string; // Base64 string
  notes: Note[];
  relationships: Relationship[];
  createdAt: number;
}

export type SortOption = 'name' | 'createdAt' | 'country';