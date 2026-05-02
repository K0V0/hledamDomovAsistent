import type { PlatformId } from './Platform';

export type NoteColor = 'red' | 'orange' | 'green' | 'blue' | 'gray' | 'black';

export type NoteItemType = 'positive' | 'negative';

export interface NoteItem {
  type: NoteItemType;
  text: string;
}

export interface Note {
  propertyId: string;
  items: NoteItem[];
  color?: NoteColor;
  platform: PlatformId;
  createdAt: number;
  updatedAt: number;
}