import type { NoteColor } from '../domain/Note';

interface ColorDef {
  swatch: string; // circle color on the picker button
  bg: string;     // preview background in list view
  border: string; // preview left-border in list view
  text: string;   // preview text color in list view
}

export const NOTE_COLORS: NoteColor[] = [
  'red', 'orange', 'green', 'blue', 'gray', 'black',
];

export const NOTE_COLOR_DEFS: Record<NoteColor, ColorDef> = {
  red:    { swatch: '#dc2626', bg: '#fecaca', border: '#dc2626', text: '#7f1d1d' },
  orange: { swatch: '#ea580c', bg: '#fed7aa', border: '#ea580c', text: '#7c2d12' },
  green:  { swatch: '#16a34a', bg: '#bbf7d0', border: '#16a34a', text: '#14532d' },
  blue:   { swatch: '#2563eb', bg: '#bfdbfe', border: '#2563eb', text: '#1e3a8a' },
  gray:   { swatch: '#6b7280', bg: '#e5e7eb', border: '#6b7280', text: '#1f2937' },
  black:  { swatch: '#1f2937', bg: '#d1d5db', border: '#374151', text: '#030712' },
};

export const DEFAULT_COLOR: NoteColor = 'orange';