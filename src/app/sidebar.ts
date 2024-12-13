import * as fuzzysort from "fuzzysort";
import { MouseState, render } from ".";
import { ctx } from "../canvas";
import { lerp } from "../math";
import data, { allElements, dataPromise, Isotope } from "../data";
import * as matter from "../matter";
import { Bodies, Body, Composite } from "matter-js";
import { Block, blocks } from "../block";
import {
  formatSeconds,
  getDarkColorForIsotope as getDarkColorForIsotope,
  rgbToHex,
} from "../util";

let sidebarPos = 0;
let isSidebarOpen = true;

let trashOpacity = 0;
enum TrashShowState {
  HIDDEN,
  TRANSITIONING,
  VISIBLE,
}
let trashShowState = TrashShowState.HIDDEN;

const searchBoxEl = document.createElement("div");
searchBoxEl.className = "search-box";
{
  const searchBoxLabelEl = document.createElement("p");
  searchBoxLabelEl.textContent = "Search";
  searchBoxEl.appendChild(searchBoxLabelEl);
}
let searchedElements: ReadonlyArray<Fuzzysort.KeysResult<Isotope>> = [];
let search = "";
{
  const inputEl = document.createElement("input");
  const reprocess = () => {
    search = inputEl.value;
    searchedElements = fuzzysort.go(search, allElements, {
      keys: [
        "sym",
        (iso) => {
          const [elem, mass] = iso.sym.split("-");
          return mass + elem;
        },
        (iso) => `${data.elements[iso.protons].name}-${iso.mass}`,
      ],
      // slightly nudge the score based on the abundance
      // so when searching for e.g "Uranium" the common ones go to the top (U-238, U-235)
      // if not abundance, then how close it is to the "normal" atomic weight
      scoreFn: (res) =>
        res.score +
        res.obj.abundance * 1e-3 +
        (res.obj.mass - data.elements[res.obj.protons].mass) * 1e-6,
    });
  };
  inputEl.addEventListener("input", reprocess);
  inputEl.addEventListener("change", reprocess);
  inputEl.value = "poloniu";

  dataPromise.then(reprocess);

  searchBoxEl.appendChild(inputEl);
}
document.body.appendChild(searchBoxEl);

const SIDEBAR_WIDTH = 290;

export function paint() {
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
      isSidebarOpen = !isSidebarOpen;
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
        trashOpacity += 20 * render.delta;
        if (trashOpacity >= 1) {
          trashOpacity = 1;
          trashShowState = TrashShowState.VISIBLE;
        }
      } else {
        trashOpacity -= 20 * render.delta;
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

  {
    const CARET_SIZE = 6;
    const caretX =
        sidebarPos +
        HANDLE_WIDTH / 2 +
        (isSidebarOpen ? CARET_SIZE : -CARET_SIZE) / 2,
      caretY = render.height / 2;
    ctx.beginPath();
    ctx.moveTo(caretX, caretY - CARET_SIZE);
    ctx.lineTo(caretX + (isSidebarOpen ? -CARET_SIZE : CARET_SIZE), caretY);
    ctx.lineTo(caretX, caretY + CARET_SIZE);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#bbb";
  ctx.fillStyle = "#ccc";
  ctx.strokeRect(sidebarPos, 0, HANDLE_WIDTH, render.height);
  ctx.fillRect(sidebarPos, 0, HANDLE_WIDTH, render.height);
  matter.setLeftWallPos(sidebarPos + HANDLE_WIDTH);
  if (sidebarPos > 0) {
    if (trashOpacity > 0) {
      ctx.globalAlpha = trashOpacity;
      paintTrash();
      ctx.fillStyle = "#ddd";
      ctx.fillRect(0, 0, sidebarPos, render.height);
      ctx.globalAlpha = 1;
    }
    if (trashOpacity < 1) {
      paintNormalSidebar();
    }
    searchBoxEl.style.opacity = String(1 - trashOpacity);

    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, sidebarPos, render.height);
  } else {
    searchBoxEl.hidden = true;
  }
}

function paintNormalSidebar() {
  if (sidebarPos < SIDEBAR_WIDTH) {
    ctx.translate(sidebarPos - SIDEBAR_WIDTH, 0);

    // cursed dom search box :)
    searchBoxEl.style.top = "90px";
    searchBoxEl.style.left = sidebarPos - SIDEBAR_WIDTH + "px";
    searchBoxEl.style.width = SIDEBAR_WIDTH + "px";
  }
  searchBoxEl.hidden = false;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "40px" + render.font;
  ctx.fillStyle = "#444";
  ctx.fillText("Elements", SIDEBAR_WIDTH / 2, 20);

  if (searchedElements.length > 0) {
    let row = 0,
      col = 0;
    for (const res of searchedElements) {
      const ELEMENT_SIZE = 100;

      const xTrans = col * 120 + 35,
        yTrans = row * 120 + 200;
      if (yTrans > render.height) break;

      const transform = ctx.getTransform();

      const iso = res.obj;

      const [element, mass] = iso.sym.split("-");

      const interaction = render.interactRect(
        xTrans,
        yTrans,
        ELEMENT_SIZE,
        ELEMENT_SIZE,
      );
      if (interaction?.state === MouseState.PRESSED) {
        const body = Bodies.rectangle(
          interaction.mouseX,
          interaction.mouseY,
          100,
          60,
          {
            restitution: 0.5,
          },
        );
        matter.add(body, true);
        blocks.set(body.id, new Block(iso.sym, 100, 60));
      } else if (interaction) {
        render.cursor = "pointer";
      }

      ctx.translate(xTrans, yTrans);

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#444";
      ctx.font = "40px" + render.font;
      ctx.fillText(element, 8, 12);
      ctx.font = "16px" + render.font;
      ctx.fillText(mass, 10, 53);
      ctx.font = "12px" + render.font;
      ctx.textAlign = "right";
      ctx.fillText(
        iso.half_life === null ? "stable" : formatSeconds(iso.half_life),
        94,
        56,
      );

      const [r, g, b] = getDarkColorForIsotope(iso);
      ctx.fillStyle = rgbToHex(r + 128, g + 128, b + 128);
      ctx.strokeStyle = rgbToHex(r, g, b);
      ctx.lineWidth = 4;
      ctx.fillRect(0, 0, ELEMENT_SIZE, ELEMENT_SIZE);
      ctx.strokeRect(0, 0, ELEMENT_SIZE, ELEMENT_SIZE);

      col++;
      if (col == 2) {
        col = 0;
        row++;
      }

      ctx.setTransform(transform);
    }
  } else if (search.length > 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#888";
    ctx.font = "20px" + render.font;
    ctx.fillText("No results", SIDEBAR_WIDTH / 2, 200);
  }

  ctx.resetTransform();
}

function paintTrash() {
  searchBoxEl.hidden = true;

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
