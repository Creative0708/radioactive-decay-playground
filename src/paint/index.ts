import { canvas, ctx } from "../canvas";
export { ctx } from "../canvas";

export interface RenderCtx {
  width: number;
  height: number;
  delta: number;

  cursor: string | null;

  rawMouseX: number;
  rawMouseY: number;

  mouseX: number;
  mouseY: number;
  mouseState: MouseState;

  font: string;

  interactRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): null | MouseInteractionResult;
  consumeInput(): void;
}

export interface MouseInteractionResult {
  mouseX: number;
  mouseY: number;
  state: MouseState;
}

export const enum MouseState {
  NONE,
  DOWN,
  PRESSED,
}

export let render: RenderCtx = {
  width: 0,
  height: 0,
  delta: 0,

  cursor: null,

  rawMouseX: NaN,
  rawMouseY: NaN,

  mouseX: NaN,
  mouseY: NaN,
  mouseState: MouseState.NONE,

  font: `"Roboto", "Helvetica", "Arial", sans-serif`,

  consumeInput(this: RenderCtx) {
    this.mouseX = this.mouseY = NaN;
    this.mouseState = MouseState.NONE;
  },
  interactRect(this: RenderCtx, x, y, width, height) {
    if (
      !(
        this.mouseX >= x &&
        this.mouseX <= x + width &&
        this.mouseY >= y &&
        this.mouseY <= y + height
      )
    )
      return null;

    const interaction: MouseInteractionResult = {
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      state: this.mouseState,
    };

    this.consumeInput();

    return interaction;
  },
};
