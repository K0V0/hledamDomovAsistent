import type { PlatformId } from './Platform';

export interface Note {
  propertyId: string;
  text: string;
  platform: PlatformId;
  createdAt: number;
  updatedAt: number;
}