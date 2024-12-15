import { MouseState, render } from ".";
import { canvas, ctx } from "../canvas";

import * as blocks from "./blocks";
import * as sidebar from "./sidebar";
import * as timeshift from "./timeshift";
import * as tooltip from "./tooltip";
import * as particles from "./particles";

import * as matter from "../matter";

let lastFrameTime: null | number = null;
export const paint = (frameTime: number) => {
  if (lastFrameTime == null) lastFrameTime = frameTime;
  if (!document.body.contains(canvas)) {
    return;
  }

  {
    render.width = canvas.width;
    render.height = canvas.height;
    render.delta = Math.min((frameTime - lastFrameTime) / 1000, 0.1);

    render.mouseX = render.rawMouseX = globalMouseX;
    render.mouseY = render.rawMouseY = globalMouseY;

    render.mouseState = matter.draggedBody ? MouseState.NONE : globalMouseState;
    if (globalMouseState === MouseState.PRESSED)
      globalMouseState = MouseState.DOWN;
    else if (globalMouseState === MouseState.NONE) matter.setDraggedBody(null);

    render.cursor = null;

    lastFrameTime = frameTime;
  }

  ctx.clearRect(0, 0, render.width, render.height);

  ctx.globalCompositeOperation = "destination-over";

  timeshift.paint();
  sidebar.paint();
  particles.paint();
  blocks.paint();

  tooltip.paint();

  document.body.style.cursor = render.cursor ?? "auto";
};

let globalMouseX = 0,
  globalMouseY = 0;
let globalMouseState = MouseState.NONE;
addEventListener("mousemove", (e) => {
  globalMouseX = e.pageX;
  globalMouseY = e.pageY;
});
addEventListener("mouseout", () => {
  render.consumeInput();
});
addEventListener("mousedown", () => {
  globalMouseState = MouseState.PRESSED;
});
addEventListener("mouseup", () => {
  globalMouseState = MouseState.NONE;
});
