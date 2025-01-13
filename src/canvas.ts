export const canvas = document.getElementById("canvas") as HTMLCanvasElement;
export const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;

export type ResizeHook = (width: number, height: number) => void;

const hooks: ResizeHook[] = [];

export function addResizeHook(hook: ResizeHook) {
  hooks.push(hook);
}

const handleCanvasSize = () => {
  const width = innerWidth,
    height = innerHeight;
  canvas.width = width;
  canvas.height = height;

  ctx.lineWidth = 50;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(0, 0, width, height);

  for (const hook of hooks) {
    hook(width, height);
  }
};
addEventListener("load", () => {
  handleCanvasSize();
  addEventListener("resize", handleCanvasSize);
});

// addEventListener("keydown", (e) => {
//   if (e.key === "d") {
//     canvas.style.pointerEvents = "none";
//     debugger;
//   }
// });
