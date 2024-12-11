export const canvas = document.createElement("canvas");
export const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;

const handleCanvasSize = () => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  ctx.lineWidth = 50;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(0, 0, innerWidth, innerHeight);
};
handleCanvasSize();
addEventListener("resize", handleCanvasSize);
