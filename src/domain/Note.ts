import type { PlatformId } from './Platform';

export type NoteColor = 'red' | 'orange' | 'green' | 'blue' | 'gray' | 'black';

export interface Note {
  propertyId: string;
  text: string;
  color?: NoteColor;
  platform: PlatformId;
  createdAt: number;
  updatedAt: number;
}