import "./index.css";

document.body.classList.remove("nojs");

import { paint } from "./paint/paint";
import { welcome } from "./welcome";

const renderLoop = (frameTime: number) => {
  paint(frameTime);

  requestAnimationFrame(renderLoop);
};
requestAnimationFrame(renderLoop);

addEventListener("load", welcome);
