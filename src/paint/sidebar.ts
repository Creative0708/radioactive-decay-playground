import * as fuzzysort from "fuzzysort";
import { MouseState, render } from ".";
import { canvas, ctx } from "../canvas";
import { lerp } from "../math";
import data, { allElements, Isotope, Sym } from "../data";
import * as matter from "../matter";
import { Bodies } from "matter-js";
import { Block, blocks } from "../block";
import {
  formatSeconds,
  getDarkColorForIsotope as getDarkColorForIsotope,
  getFullNameForIsotope,
  rgbToHex,
} from "../util";

import "./sidebar/extra_options";
import { showTooltip } from "./tooltip";

let sidebarPos = 0;
let isSidebarOpen = true;

let trashOpacity = 0;
enum TrashShowState {
  HIDDEN,
  TRANSITIONING,
  VISIBLE,
}
let trashShowState = TrashShowState.HIDDEN;

const sidebarEl = document.getElementById("sidebar-container")!;
if (isSidebarOpen) sidebarEl.classList.add("sidebar-open");
const sidebarContentsEl = document.getElementById("sidebar")!;

const resultsEl = document.getElementById("sidebar-results")!;
resultsEl.addEventListener("mousedown", (e) => {
  if (matter.draggedBody) return;

  const el = e.target! as HTMLElement;
  const isoEl: HTMLElement | null = el.closest(".sidebar-isotope");
  if (!isoEl) return;

  const sym = isoEl.dataset.sym!;
  addBlock(sym, e.pageX, e.pageY);
});

export function addBlock(sym: Sym, x: number, y: number) {
  const body = Bodies.rectangle(x, y, 100, 60, {
    restitution: 0.5,
  });
  matter.add(body, true);
  blocks.set(body.id, new Block(sym, 100, 60));
}

let hoveredSym: Sym | null = null;
document.body.addEventListener("mousemove", (e) => {
  hoveredSym = null;
  if (matter.draggedBody) return;

  const el = e.target! as HTMLElement;
  const isoEl: HTMLElement | null = el.closest(".sidebar-isotope");
  if (!isoEl) return;

  const sym = isoEl.dataset.sym!;

  hoveredSym = sym;
});

const inputEl = document.getElementById("search-box")! as HTMLInputElement;
const reprocess = () => {
  const LIMIT = 50;

  const search = inputEl.value;
  const searchedElements = fuzzysort.go(search, allElements, {
    keys: [
      "sym",
      (iso) => {
        const [elem, mass] = iso.sym.split("-");
        return mass + elem;
      },
      (iso) => `${data.elements[iso.protons].name}-${iso.mass}`,
    ],
    limit: LIMIT,
    // slightly nudge the score based on the abundance
    // so when searching for e.g "Uranium" the common ones go to the top (U-238, U-235)
    // if not abundance, then how close it is to the "normal" atomic weight
    scoreFn: (res) =>
      res.score +
      res.obj.abundance * 1e-3 +
      (res.obj.mass - data.elements[res.obj.protons].mass) * 1e-6,
  });

  const children: (HTMLElement | string)[] = [];
  if (searchedElements.length > 0) {
    for (const res of searchedElements) {
      const iso = res.obj;

      const isoEl = document.createElement("div");
      isoEl.className = "sidebar-isotope";
      isoEl.dataset.sym = iso.sym;

      const [element, mass] = iso.sym.split("-");

      isoEl.innerHTML = `
        <h1>
          ${element}
          <span>${mass}</span>
        </h1>
        <span>${iso.half_life === null ? "stable" : formatSeconds(iso.half_life).html}</span>
        `;

      const [r, g, b] = getDarkColorForIsotope(iso);
      isoEl.style.backgroundColor = rgbToHex(r + 128, g + 128, b + 128);
      isoEl.style.borderColor = rgbToHex(r, g, b);

      children.push(isoEl);
    }

    if (searchedElements.total > LIMIT) {
      const msgEl = document.createElement("span");
      msgEl.textContent = "(Cut off after 50 results)";
      children.push(msgEl);
    }
  } else if (search.length > 0) {
    const msgEl = document.createElement("span");
    msgEl.textContent = "No results";
    children.push(msgEl);
  }

  resultsEl.replaceChildren(...children);
};
inputEl.addEventListener("input", reprocess);
inputEl.addEventListener("change", reprocess);

export function setSidebarOpen(open: boolean) {
  if (open === isSidebarOpen) return;
  isSidebarOpen = open;
  if (open) {
    sidebarEl.classList.add("sidebar-open");
  } else {
    sidebarEl.classList.remove("sidebar-open");
  }
}

const SIDEBAR_WIDTH = 300;

export function paint() {
  canvas.style.pointerEvents = render.mouseX <= sidebarPos ? "none" : "auto";

  const HANDLE_WIDTH = 20;

  const interaction = render.interactRect(
    sidebarPos,
    0,
    HANDLE_WIDTH,
    render.height,
  );
  if (interaction) {
    render.cursor = "pointer";
    if (interaction.state == MouseState.PRESSED) {
      setSidebarOpen(!isSidebarOpen);
    }
  }

  const shouldShowTrash = matter.draggedBody !== null;
  if (shouldShowTrash && trashShowState === TrashShowState.HIDDEN) {
    trashShowState = isSidebarOpen
      ? TrashShowState.TRANSITIONING
      : TrashShowState.VISIBLE;
  } else if (
    !shouldShowTrash &&
    trashShowState === TrashShowState.VISIBLE &&
    isSidebarOpen
  ) {
    trashShowState = TrashShowState.TRANSITIONING;
  } else if (sidebarPos === 0 && trashShowState === TrashShowState.VISIBLE) {
    trashShowState = TrashShowState.HIDDEN;
  }

  sidebarPos = lerp(
    sidebarPos,
    isSidebarOpen || shouldShowTrash ? SIDEBAR_WIDTH : 0,
    20,
  );

  // overcomplicated state machine go brrr
  switch (trashShowState) {
    case TrashShowState.HIDDEN: {
      trashOpacity = 0;
      break;
    }
    case TrashShowState.TRANSITIONING: {
      if (shouldShowTrash) {
        trashOpacity += 10 * render.delta;
        if (trashOpacity >= 1) {
          trashOpacity = 1;
          trashShowState = TrashShowState.VISIBLE;
        }
      } else {
        trashOpacity -= 10 * render.delta;
        if (trashOpacity <= 0) {
          trashOpacity = 0;
          trashShowState = TrashShowState.HIDDEN;
        }
      }
      break;
    }
    case TrashShowState.VISIBLE: {
      trashOpacity = 1;
      break;
    }
  }

  matter.setLeftWallPos(sidebarPos + HANDLE_WIDTH);
  sidebarEl.style.left = sidebarPos - SIDEBAR_WIDTH + "px";
  if (sidebarPos > 0) {
    sidebarContentsEl.hidden = false;
    if (trashOpacity > 0) {
      ctx.globalAlpha = trashOpacity;
      paintTrash();
      ctx.fillStyle = "#ddd";
      ctx.fillRect(0, 0, sidebarPos - 4, render.height);
      ctx.globalAlpha = 1;
    }
  } else {
    sidebarContentsEl.hidden = true;
  }

  if (hoveredSym) {
    const sym = hoveredSym;

    const iso = data.isotopes[sym];
    const elem = data.elements[iso.protons];

    showTooltip("element", (data: { iso: Isotope } | null, outer) => {
      outer.innerHTML = `
          <h1>${getFullNameForIsotope(sym)} <span class="weak">${sym}, <sup>${iso.mass}</sup>${elem.symbol}</span></h1>

          ${iso.half_life === null ? "Stable" : "Half-life: " + formatSeconds(iso.half_life, 4).html}
          `;

      return { iso };
    });
  }
}

function paintTrash() {
  ctx.translate(sidebarPos - SIDEBAR_WIDTH / 2, render.height / 2);

  ctx.fillStyle = "#444";

  for (let i = -20; i <= 20; i += 20) {
    ctx.fillRect(i - 4, -30, 8, 60);
  }

  ctx.fillStyle = "#888";

  ctx.fillRect(-40, -40, 80, 80);

  if (render.mouseX < sidebarPos) {
    ctx.rotate(0.25);
    ctx.translate(-8, -10);
  }

  ctx.fillRect(-48, -62, 96, 15);
  ctx.fillRect(-10, -70, 20, 20);

  ctx.resetTransform();
}

matter.onMouseConstraintEvent("enddrag", (body) => {
  if (render.mouseX < sidebarPos) {
    blocks.delete(body.id);
    matter.remove(body);
  }
});
