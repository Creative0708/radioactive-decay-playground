import { MouseState, render } from ".";
import { canvas, ctx } from "../canvas";

import * as matter from "./matter";
import * as sidebar from "./sidebar";

let lastFrameTime: null | number = null;
export const paint = (frameTime: number) => {
  if (lastFrameTime == null) lastFrameTime = frameTime;

  {
    render.width = canvas.width;
    render.height = canvas.height;
    render.delta = (frameTime - lastFrameTime) / 1000;

    render.mouseX = globalMouseX;
    render.mouseY = globalMouseY;

    render.mouseState = globalMouseState;
    if (globalMouseState === MouseState.PRESSED)
      globalMouseState = MouseState.DOWN;

    render.cursor = null;

    lastFrameTime = frameTime;
  }

  ctx.clearRect(0, 0, render.width, render.height);

  ctx.globalCompositeOperation = "destination-over";

  sidebar.paint();
  matter.paint();

  canvas.style.cursor = render.cursor ?? "auto";
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
