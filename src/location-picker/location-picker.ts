import L from 'leaflet';
import leafletCss from 'leaflet/dist/leaflet.css';
import { getHomeLocation, saveHomeLocation } from '../config/homeLocation';

// Inject Leaflet CSS (loaded as text by esbuild). The marker/layers image URLs
// in the CSS are never requested because we use a custom divIcon.
const styleEl = document.createElement('style');
styleEl.textContent = leafletCss as unknown as string;
document.head.appendChild(styleEl);

const PRAGUE: L.LatLngExpression = [50.075, 14.437];
const DEFAULT_ZOOM = 8;

const markerIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;background:#1a73e8;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

let marker: L.Marker | null = null;
let selectedLat = 0;
let selectedLng = 0;
let selectedLabel = '';

const mapEl = document.getElementById('map') as HTMLDivElement;
const searchInput = document.getElementById('search') as HTMLInputElement;
const dropdown = document.getElementById('search-dropdown') as HTMLUListElement;
const coordsEl = document.getElementById('coords') as HTMLSpanElement;
const saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

const map = L.map(mapEl).setView(PRAGUE, DEFAULT_ZOOM);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

function placeMarker(lat: number, lng: number, label: string): void {
  selectedLat = lat;
  selectedLng = lng;
  selectedLabel = label;

  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const pos = marker!.getLatLng();
      selectedLat = pos.lat;
      selectedLng = pos.lng;
      selectedLabel = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
      updateCoords();
    });
  }

  updateCoords();
  saveBtn.disabled = false;
}

function updateCoords(): void {
  coordsEl.textContent = `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`;
}

map.on('click', (e: L.LeafletMouseEvent) => {
  placeMarker(e.latlng.lat, e.latlng.lng, `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
});

// ── Search ────────────────────────────────────────────────────────────────────

let searchTimer: ReturnType<typeof setTimeout> | null = null;

searchInput.addEventListener('input', () => {
  if (searchTimer) clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (q.length < 3) { hideDropdown(); return; }
  searchTimer = setTimeout(() => doSearch(q), 400);
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { hideDropdown(); searchInput.blur(); }
});

document.addEventListener('click', e => {
  if (!(e.target as Element).closest('#search-wrapper')) hideDropdown();
});

async function doSearch(q: string): Promise<void> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=cz,sk&addressdetails=0`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'cs' } });
    const results: NominatimResult[] = await res.json() as NominatimResult[];
    showDropdown(results);
  } catch {
    hideDropdown();
  }
}

function showDropdown(results: NominatimResult[]): void {
  dropdown.innerHTML = '';
  if (results.length === 0) {
    const li = document.createElement('li');
    li.className = 'dropdown-empty';
    li.textContent = 'Žádné výsledky';
    dropdown.appendChild(li);
  } else {
    for (const r of results) {
      const li = document.createElement('li');
      li.textContent = r.display_name;
      li.addEventListener('click', () => {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        map.setView([lat, lng], 14);
        placeMarker(lat, lng, r.display_name);
        searchInput.value = r.display_name;
        hideDropdown();
      });
      dropdown.appendChild(li);
    }
  }
  dropdown.style.display = 'block';
}

function hideDropdown(): void {
  dropdown.style.display = 'none';
}

// ── Save ──────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', async () => {
  await saveHomeLocation({ lat: selectedLat, lng: selectedLng, label: selectedLabel });
  showStatus('Výchozí poloha byla uložena.', 'success');
});

function showStatus(text: string, type: 'success' | 'error'): void {
  statusEl.textContent = text;
  statusEl.className = `status--${type}`;
  statusEl.style.display = 'block';
  setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  const saved = await getHomeLocation();
  if (saved) {
    map.setView([saved.lat, saved.lng], 13);
    placeMarker(saved.lat, saved.lng, saved.label);
    searchInput.value = saved.label;
  }
}

init().catch(console.error);