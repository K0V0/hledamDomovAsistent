const CSS = `
.hda-widget {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  font-family: system-ui, sans-serif;
  position: relative;
  z-index: 9999;
  margin-top: 6px;
}

.hda-widget__toggle {
  background: #1a73e8;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
}

.hda-widget__toggle:hover {
  background: #1557b0;
}

.hda-widget__toggle--has-note {
  background: #188038;
}

.hda-widget__toggle--has-note:hover {
  background: #0d652d;
}

.hda-widget__panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fff;
  border: 1px solid #dadce0;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,.18);
  min-width: 260px;
}

.hda-widget__textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
  min-height: 72px;
}

.hda-widget__textarea:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26,115,232,.2);
}

.hda-widget__status {
  font-size: 11px;
  color: #5f6368;
  text-align: right;
  min-height: 14px;
}
`;

let injected = false;

export function injectStyles(): void {
  if (injected) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  injected = true;
}