import * as fuzzysort from "fuzzysort";
import { MouseState, render } from ".";
import { ctx } from "../canvas";
import { lerp } from "../math";
import data, { allElements, Isotope } from "../data";

let sidebarPos = 0;
let isSidebarOpen = true;

const searchBoxEl = document.createElement("div");
searchBoxEl.className = "search-box";
{
  const searchBoxLabelEl = document.createElement("p");
  searchBoxLabelEl.textContent = "Search";
  searchBoxEl.appendChild(searchBoxLabelEl);
}
let searchedElements: ReadonlyArray<Fuzzysort.KeysResult<Isotope>> = [];
{
  const inputEl = document.createElement("input");
  const reprocess = () => {
    const search = inputEl.value;
    searchedElements = fuzzysort.go(search, allElements, {
      keys: ["sym", (iso) => data.elements[iso.protons].element],
      // slightly nudge the score based on the abundance
      // so when searching for e.g "Uranium" the common ones go to the top (U-238, U-235)
      scoreFn: (res) => res.score + (data.abundances[res.obj.sym] ?? 0) * 1e-3,
    });
  };
  inputEl.addEventListener("input", reprocess);
  inputEl.addEventListener("change", reprocess);

  inputEl.value = "Uranium";
  setTimeout(reprocess, 100);

  searchBoxEl.appendChild(inputEl);
}
document.body.appendChild(searchBoxEl);

export function paint() {
  const SIDEBAR_WIDTH = 256;
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

  sidebarPos = lerp(sidebarPos, isSidebarOpen ? SIDEBAR_WIDTH : 0, 20);

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
    ctx.stroke();
  }

  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 2;
  ctx.strokeRect(sidebarPos, 0, HANDLE_WIDTH, render.height);
  ctx.fillStyle = "#ccc";
  ctx.fillRect(sidebarPos, 0, HANDLE_WIDTH, render.height);
  if (sidebarPos > 0) {
    if (sidebarPos < SIDEBAR_WIDTH) {
      ctx.translate(sidebarPos - SIDEBAR_WIDTH, 0);

      // cursed dom search box :)
      searchBoxEl.style.visibility = "visible";
      searchBoxEl.style.top = "90px";
      searchBoxEl.style.left = sidebarPos - SIDEBAR_WIDTH + "px";
      searchBoxEl.style.width = SIDEBAR_WIDTH + "px";
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "40px" + render.font;
    ctx.fillStyle = "#444";
    ctx.fillText("Elements", SIDEBAR_WIDTH / 2, 20);

    let row = 0,
      col = 0;
    for (const res of searchedElements) {
      const ELEMENT_SIZE = 80;

      const xTrans = col * 100 + 35,
        yTrans = row * 100 + 200;
      if (yTrans > render.height) break;

      const transform = ctx.getTransform();

      const iso = res.obj;

      const [element, mass] = iso.sym.split("-");

      ctx.translate(xTrans, yTrans);

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#444";
      ctx.font = "40px" + render.font;
      ctx.fillText(element, ELEMENT_SIZE / 2, 12);
      ctx.font = "16px" + render.font;
      ctx.fillText(mass, ELEMENT_SIZE / 2, 52);

      ctx.fillStyle = "#888";
      ctx.fillRect(0, 0, ELEMENT_SIZE, ELEMENT_SIZE);

      col++;
      if (col == 2) {
        col = 0;
        row++;
      }

      ctx.setTransform(transform);
    }

    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, SIDEBAR_WIDTH, render.height);

    ctx.resetTransform();
  } else {
    searchBoxEl.style.visibility = "hidden";
  }
}
