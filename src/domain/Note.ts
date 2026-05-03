import type { GpsCoordinates } from './GpsCoordinates';
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
  title?: string;
  price?: number;
  workflowStepIds?: string[];
  gps?: GpsCoordinates;
  distanceAirKm?: number;
  distanceRoadM?: number;
  durationRoadS?: number;
  createdAt: number;
  updatedAt: number;
}