import { Body, Query } from "matter-js";
import * as matter from "../matter";
import { ctx } from "../canvas";
import { render } from ".";
import { Block, blocks } from "../block";
import {
  formatSeconds,
  getDarkColorForIsotope,
  getFullNameForIsotope,
  rgbToHex,
} from "../util";
import { showTooltip } from "./tooltip";
import * as Plot from "@observablehq/plot";
import data, { Sym } from "../data";
import { timescale } from "./timeshift";

enum BlockMouseState {
  NONE,
  HOVERED,
  DRAGGED,
}

const APPROXIMATE_THRESHOLD = 0.7;

export function paint() {
  const bodies = matter.world.bodies;

  if (matter.draggedBody) render.cursor = "grabbing";

  let hoveredBody: null | Body = null;
  if (!matter.draggedBody && isFinite(render.mouseX)) {
    hoveredBody = Query.point(bodies, {
      x: render.mouseX,
      y: render.mouseY,
    })[0];
  }
  if (hoveredBody?.isStatic) hoveredBody = null;

  if (hoveredBody) {
    render.cursor = "pointer";

    const block = blocks.get(hoveredBody.id)!;

    showTooltip("block", (tooltipData: { id: number } | null, el) => {
      const isNew = tooltipData?.id !== hoveredBody.id;

      if (!isNew && block.isStable) return null;

      let headingEl: HTMLElement;
      let descriptorEl: HTMLElement;
      if (isNew) {
        el.replaceChildren();

        headingEl = document.createElement("h1");
        descriptorEl = document.createElement("p");
        descriptorEl.id = "iso-descriptor";
        el.appendChild(headingEl);
        el.appendChild(descriptorEl);
      } else {
        headingEl = el.querySelector("h1")!;
        descriptorEl = el.querySelector("#iso-descriptor")!;
      }

      const [approxSym, approxPortion] = block.approximate();

      let now: null | Sym =
        approxPortion >= APPROXIMATE_THRESHOLD ? approxSym : null;

      headingEl.innerHTML =
        (now
          ? `Block of ${getFullNameForIsotope(now)}`
          : `Block of various isotopes`) +
        (now === block.originalSym
          ? ""
          : ` <span class="weak">(originally ${block.originalSym})</span>`);

      if (now) {
        const isotope = data.isotopes[now];
        descriptorEl.innerHTML =
          isotope.half_life === null
            ? `${now} is stable`
            : `${now} has a half-life of ${formatSeconds(isotope.half_life).html}`;
      } else {
        descriptorEl.innerHTML = "&nbsp";
      }

      if (block.history.length === 1 && block.isStable) {
        const pEl = document.createElement("p");
        pEl.textContent = `${block.originalSym} is stable and won't decay.`;
        el.appendChild(pEl);
      } else {
        const width = 480,
          height = 300;

        const plotData: {
          sym: Sym;
          time: number;
          percentage: number;
        }[] = [];

        let { multiplier, unit } = formatSeconds(block.lifetime);
        if (unit === "yr" && block.lifetime * multiplier >= 1e3) {
          const log10 = Math.log10(block.lifetime * multiplier) | 0;
          unit = `1e${log10} yr`;
          multiplier *= 10 ** -log10;
        }

        // 1 point every 2 pixels
        const timeInterval = (block.lifetime / width) * 2;
        let nextTime = 0;
        for (const { time, isotopes } of block.history) {
          if (time < nextTime) continue;
          nextTime = time + timeInterval;

          for (const [sym, portion] of Object.entries(isotopes)) {
            plotData.push({
              sym,
              time: time * multiplier,
              percentage: portion * 100,
            });
          }
        }
        const colors: string[] = [];
        const allIsotopes = [...block.allIsotopes];
        allIsotopes.sort();
        for (const sym of allIsotopes) {
          const [r, g, b] = getDarkColorForIsotope(sym);
          colors.push(rgbToHex(r * 2, g * 2, b * 2));
        }

        const plot = Plot.plot({
          marks: [
            Plot.line(plotData, {
              x: {
                value: "time",
                label: `time (${unit})`,
              },
              y: { value: "percentage" },
              z: "sym",
              stroke: "sym",
            }),
          ],
          y: { domain: [0, 100] },
          color: {
            type: "categorical",
            range: colors,
          },
        });
        plot.style.width = width + "px";
        plot.style.height = height + "px";
        plot.classList.add("plot");

        const legend = plot.legend("color")!;
        legend.classList.add("legend");

        if (isNew) {
          el.appendChild(plot);
          el.appendChild(legend);
        } else {
          el.replaceChild(plot, el.querySelector(".plot")!);
          el.replaceChild(legend, el.querySelector(".legend")!);
        }
      }

      return isNew ? { id: hoveredBody.id } : null;
    });
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const body of bodies) {
    const block = blocks.get(body.id);
    // walls count as bodies so ignore them if they're not in the map
    if (!block) continue;

    ctx.translate(body.position.x, body.position.y);
    const ROUNDING_CONSTANT = 512 / Math.PI;
    ctx.rotate(Math.round(body.angle * ROUNDING_CONSTANT) / ROUNDING_CONSTANT);

    const blockState =
      body === matter.draggedBody
        ? BlockMouseState.DRAGGED
        : body === hoveredBody
          ? BlockMouseState.HOVERED
          : BlockMouseState.NONE;

    paintBlock(block, blockState);

    ctx.resetTransform();

    const vertices = body.vertices;

    for (let j = 0; j < vertices.length; j++) {
      const vertex = vertices[j];
      ctx[j == 0 ? "moveTo" : "lineTo"](vertex.x, vertex.y);
    }
  }

  // walls
  {
    ctx.fillStyle = "#222";
    // left
    ctx.fillRect(matter.leftWallPos, 0, matter.WALL_INSET, render.height);
    // right
    ctx.fillRect(
      render.width - matter.WALL_INSET,
      0,
      matter.WALL_INSET,
      render.height,
    );
    // bottom
    ctx.fillRect(
      matter.leftWallPos,
      render.height - matter.WALL_INSET,
      render.width - matter.leftWallPos,
      matter.WALL_INSET,
    );
  }

  matter.tick(render.delta);
}

const STEPS = 16;

function paintBlock(block: Block, blockState: BlockMouseState) {
  // also used for if this is being painted back-to-front
  const isDragged = blockState === BlockMouseState.DRAGGED;
  if (!isDragged && !block.isStable) {
    const delta = (render.delta * timescale) / STEPS;
    const shouldSaveMinorHistory = block.lifetime < timescale * STEPS;
    for (let i = 0; i < STEPS; i++) {
      block.tick(delta);
      if (shouldSaveMinorHistory) block.saveHistory();
    }
    if (!shouldSaveMinorHistory) block.saveHistory();
  }

  const { width, height } = block;

  const [approxSym, approxPortion] = block.approximate();

  const drawBackground = () => {
    const transform = ctx.getTransform();
    ctx.translate(-width / 2, -height / 2);

    const [r, g, b] = getDarkColorForIsotope(approxSym);
    ctx.strokeStyle = rgbToHex(r, g, b);

    if (!isDragged) {
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
    }

    const backgroundColorBump =
      blockState === BlockMouseState.HOVERED ? 150 : 128;

    let portion = 0;
    for (const sym in block.composition) {
      const widthOfSym = block.composition[sym] * width;

      const [r, g, b] = getDarkColorForIsotope(sym);
      ctx.fillStyle = rgbToHex(
        r + backgroundColorBump,
        g + backgroundColorBump,
        b + backgroundColorBump,
      );

      if (isDragged) {
        ctx.fillRect(portion, 0, width - portion, height);
      } else {
        ctx.fillRect(0, 0, portion + widthOfSym, height);
      }

      portion += widthOfSym;
    }
    if (isDragged) {
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
    }

    ctx.setTransform(transform);
  };

  if (isDragged) {
    ctx.globalCompositeOperation = "source-over";
    drawBackground();
  }

  {
    ctx.fillStyle = "#444";
    if (approxPortion >= APPROXIMATE_THRESHOLD) {
      const [sym, mass] = approxSym.split("-");

      ctx.font = "30px" + render.font;
      ctx.fillText(sym, 0, -22);
      ctx.font = "15px" + render.font;
      ctx.fillText(mass, 0, 8);
    } else {
      ctx.font = "40px" + render.font;
      ctx.fillText("~", 0, -18);
    }
  }

  if (isDragged) {
    ctx.globalCompositeOperation = "destination-over";
  } else {
    drawBackground();
  }
}
