import { render } from ".";

let currentTooltip: null | [string, object] = null;
let wasTooltipShownThisFrame = false;

const tooltipEl = document.createElement("div");
tooltipEl.className = "tooltip";
document.body.appendChild(tooltipEl);

export function showTooltip<T extends object>(
  key: string,
  func: (val: T | null, outer: HTMLElement) => T,
) {
  if (wasTooltipShownThisFrame) return;
  wasTooltipShownThisFrame = true;

  let value: T | null = null;
  if (currentTooltip && currentTooltip[0] === key)
    value = currentTooltip[1] as T;

  const result = func(value, tooltipEl);

  currentTooltip = [key, result];
}

export function paint() {
  tooltipEl.hidden = wasTooltipShownThisFrame;
  if (wasTooltipShownThisFrame) {
    tooltipEl.style.left = render.rawMouseX + "px";
    tooltipEl.style.top = render.rawMouseY + "px";
    wasTooltipShownThisFrame = false;
  }
}
