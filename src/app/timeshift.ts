import { render } from ".";
import { setTimescale, timescale } from "../block";
import { ctx } from "../canvas";
import { TAU } from "../math";
import * as matter from "../matter";
import { rgbToHex } from "../util";

interface Timeshift {
  scale: number;
  display: string;
}

const TIMESHIFTS: Timeshift[] = [];
for (const [scale, unit, maxPow] of [
  [1e-12, "ps", 100],
  [1e-9, "ns", 100],
  [1e-6, "μs", 100],
  [1e-3, "ms", 100],

  [1, "s", 10],
  [60, "min", 10],
  [60 * 60, "h", 1],
  [60 * 60 * 24, "day", 1],
  [60 * 60 * 24 * 7, "week", 1],
] satisfies [number, string, number][]) {
  for (let multiplier = 1; multiplier <= maxPow; multiplier *= 10) {
    TIMESHIFTS.push({
      scale: scale * multiplier,
      display: multiplier + unit,
    });
  }
}
for (let multiplier = 1; multiplier <= 1e9; multiplier *= 10) {
  TIMESHIFTS.push({
    scale: 60 * 60 * 24 * 365.25 * multiplier,
    display:
      (multiplier <= 1000
        ? multiplier
        : `10<sup>${Math.log10(multiplier)}</sup>`) +
      " year" +
      (multiplier > 1 ? "s" : ""),
  });
}

const SECOND_OFFSET = TIMESHIFTS.findIndex((ts) => ts.scale === 1);

const containerEl = document.createElement("div");
containerEl.className = "time-container";
{
  const pEl = document.createElement("p");
  pEl.textContent = "Time scaling";
  containerEl.appendChild(pEl);
}
const labelEl = document.createElement("label");
const sliderEl = document.createElement("input");
labelEl.htmlFor = sliderEl.id = "time-slider";
sliderEl.type = "range";
sliderEl.min = "0";
sliderEl.max = String(TIMESHIFTS.length - 1);
sliderEl.value = String(SECOND_OFFSET);
containerEl.append(sliderEl, labelEl);

let val = 0;
let clockStrokeStyle = "";
let clockFillStyle = "";
const inputUpdate = () => {
  val = +sliderEl.value;

  const timescale = TIMESHIFTS[val];

  labelEl.innerHTML = `1s = ${timescale.display}`;
  setTimescale(timescale.scale);

  // cosmetic changes
  const centered_val = val - SECOND_OFFSET;

  matter.engine.timing.timeScale = 1 / (1 - centered_val * 0.03);

  const BASELINE = 0x44;
  const r = BASELINE - Math.min(centered_val, 0) * 14,
    g = BASELINE,
    b = BASELINE + Math.max(centered_val, 0) * 14;
  clockStrokeStyle = rgbToHex(r, g, b);
  clockFillStyle = rgbToHex((r >> 3) + 224, (g >> 3) + 224, (b >> 3) + 224);
};
sliderEl.addEventListener("input", inputUpdate);
inputUpdate();

document.body.appendChild(containerEl);

let seconds = 0;
export const paint = () => {
  // little clock icon
  ctx.translate(render.width - 100, 170);
  {
    const CLOCK_SIZE = 45;

    const transform = ctx.getTransform();

    ctx.strokeStyle = clockStrokeStyle;

    // clock hands
    for (const [multiplier, lineWidth, size] of [
      [60 * 60 * 12, 5, 0.5],
      [60 * 60, 4, 0.7],
      [60, 2, 0.8],
    ]) {
      ctx.rotate(
        // the +(timescale > multiplier && Math.random()) part makes it look better ok
        (seconds / multiplier + +(timescale > multiplier && Math.random())) *
          TAU,
      );
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -CLOCK_SIZE * size);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.setTransform(transform);
    }

    ctx.beginPath();
    ctx.ellipse(0, 0, CLOCK_SIZE, CLOCK_SIZE, 0, 0, TAU);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = clockFillStyle;
    ctx.fill();
  }
  ctx.resetTransform();

  seconds += timescale * render.delta;
  const TWELVE_HOURS = 60 * 60 * 12;
  if (seconds >= TWELVE_HOURS) {
    seconds %= TWELVE_HOURS;
  }
};
