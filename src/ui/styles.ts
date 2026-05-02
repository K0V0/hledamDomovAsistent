import widgetCss from './noteWidget.css';
import colorsCss from './noteColors.css';
import workflowCss from './workflowTrain.css';

const BASE_CSS = widgetCss + '\n' + colorsCss + '\n' + workflowCss;

let injected = false;

/**
 * Inject the base widget styles plus optional platform-specific overrides.
 * Safe to call multiple times — only the first call has any effect.
 * Platform overrides are appended after base styles so they take precedence.
 */
export function injectStyles(overrides = ''): void {
  if (injected) return;
  const style = document.createElement('style');
  style.textContent = overrides ? BASE_CSS + '\n' + overrides : BASE_CSS;
  document.head.appendChild(style);
  injected = true;
}