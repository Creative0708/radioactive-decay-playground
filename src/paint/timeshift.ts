import { render } from ".";
import { setUniverseTime, universeTime } from "../block";
import { ctx } from "../canvas";
import { TAU } from "../math";
import * as matter from "../matter";
import { formatSeconds, rgbToHex } from "../util";

export let timescale = 1;

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
  [60 * 60 * 24, " day", 1],
  [60 * 60 * 24 * 7, " week", 1],
] satisfies [number, string, number][]) {
  for (let multiplier = 1; multiplier <= maxPow; multiplier *= 10) {
    TIMESHIFTS.push({
      scale: scale * multiplier,
      display: multiplier + unit,
    });
  }
}
for (const multiplier of [
  1,
  1e1,
  1e2,
  1e3,
  1e4,
  1e5,
  1e6,
  1e7,
  1e8,
  1e9,
  1e10,
  1e20, // goshdarn bismuth-209
]) {
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

const containerEl = document.getElementById("timeshift-container")!;
const labelEl = containerEl.querySelector("label")!;
const sliderEl = containerEl.querySelector("input")!;
sliderEl.type = "range";
sliderEl.min = "0";
sliderEl.max = String(TIMESHIFTS.length - 1);
sliderEl.value = String(SECOND_OFFSET);

let val = 0;
let clockStrokeStyle = "";
let clockFillStyle = "";
const inputUpdate = () => {
  val = +sliderEl.value;

  const currTimescale = TIMESHIFTS[val];

  labelEl.innerHTML = `1s = ${currTimescale.display}`;
  timescale = currTimescale.scale;

  // cosmetic changes
  const centered_val = val - SECOND_OFFSET;

  matter.engine.timing.timeScale = 1 / (1 - centered_val * 0.01);

  const BASELINE = 0x44;
  const r = BASELINE - Math.min(centered_val, 0) * 14,
    g = BASELINE,
    b = BASELINE + Math.max(centered_val, 0) * 14;
  clockStrokeStyle = rgbToHex(r, g, b);
  clockFillStyle = rgbToHex((r >> 3) + 224, (g >> 3) + 224, (b >> 3) + 224);
};
sliderEl.addEventListener("input", inputUpdate);
inputUpdate();

addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLElement && e.target.tagName === "INPUT") return;
  switch (e.key) {
    case "ArrowLeft":
      if (+sliderEl.value > +sliderEl.min) (sliderEl.value as any)--;
      inputUpdate();
      break;
    case "ArrowRight":
      if (+sliderEl.value < +sliderEl.max) (sliderEl.value as any)++;
      inputUpdate();
      break;
  }
});

const timeEl = document.getElementById("timeshift-timeval")!;

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
        (seconds / multiplier +
          +(timescale >= multiplier * 60 && Math.random())) *
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
  setUniverseTime(universeTime + timescale * render.delta);
  const TWELVE_HOURS = 60 * 60 * 12;
  if (seconds >= TWELVE_HOURS) {
    seconds %= TWELVE_HOURS;
  }

  timeEl.innerHTML = formatSeconds(universeTime, 3).html;
};
