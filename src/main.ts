document.body.classList.remove("nojs");

import { paint } from "./app/paint";

const renderLoop = (frameTime: number) => {
  paint(frameTime);

  requestAnimationFrame(renderLoop);
};
requestAnimationFrame(renderLoop);
