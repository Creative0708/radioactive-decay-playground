import { render } from ".";

let currentTooltip: null | {
  key: string;
  value: unknown;
  rect: DOMRectReadOnly;
} = null;
let wasTooltipShownThisFrame = false;

const tooltipEl = document.getElementById("tooltip")!;

export function showTooltip<T>(
  key: string,
  func: (val: T | null, outer: HTMLElement) => T | null | undefined,
) {
  if (wasTooltipShownThisFrame) return;
  wasTooltipShownThisFrame = true;

  let value: T | null = null;
  if (currentTooltip && currentTooltip.key === key)
    value = currentTooltip.value as T;

  const result = func(value, tooltipEl);

  if (result) {
    const tooltipStyle = tooltipEl.style;

    tooltipStyle.width = tooltipStyle.height = "";
    tooltipStyle.left = tooltipStyle.top = "0";
    tooltipStyle.right = tooltipStyle.bottom = "";

    const rect = tooltipEl.getBoundingClientRect();
    currentTooltip = {
      key,
      value: result,
      rect,
    };
    tooltipStyle.width = rect.width + "px";
    tooltipStyle.height = rect.height + "px";
  }
}

export function paint() {
  tooltipEl.style.opacity = wasTooltipShownThisFrame ? "1" : "0";

  if (render.rawMouseX > render.width - (currentTooltip?.rect?.width ?? 0)) {
    tooltipEl.style.right = render.width - render.rawMouseX + "px";
    tooltipEl.style.left = "auto";
  } else {
    tooltipEl.style.left = render.rawMouseX + "px";
    tooltipEl.style.right = "auto";
  }
  if (render.rawMouseY > render.height - (currentTooltip?.rect?.height ?? 0)) {
    tooltipEl.style.bottom = render.height - render.rawMouseY + "px";
    tooltipEl.style.top = "auto";
  } else {
    tooltipEl.style.top = render.rawMouseY + "px";
    tooltipEl.style.bottom = "auto";
  }
  wasTooltipShownThisFrame = false;
}
