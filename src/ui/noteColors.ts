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
  red:    { swatch: '#ef4444', bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d' },
  orange: { swatch: '#f97316', bg: '#fff7ed', border: '#f97316', text: '#7c2d12' },
  green:  { swatch: '#22c55e', bg: '#f0fdf4', border: '#22c55e', text: '#14532d' },
  blue:   { swatch: '#3b82f6', bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a' },
  gray:   { swatch: '#6b7280', bg: '#f9fafb', border: '#9ca3af', text: '#374151' },
  black:  { swatch: '#1f2937', bg: '#f3f4f6', border: '#374151', text: '#111827' },
};

export const DEFAULT_COLOR: NoteColor = 'orange';