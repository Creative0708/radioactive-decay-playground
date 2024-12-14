import { World } from "matter-js";
import { blocks, setUniverseTime } from "../../block";
import { world } from "../../matter";

const extraOptionsEl = document.getElementById("extra-options")!;

const extraButton = (name: string, handler: (el: HTMLElement) => void) => {
  const buttonEl = document.createElement("button");
  buttonEl.textContent = name;
  buttonEl.addEventListener("click", () => handler(buttonEl));

  extraOptionsEl.appendChild(buttonEl);
};

let clearAllTimeout: null | number = null;
extraButton("Clear all and reset", (el) => {
  if (el.dataset.areYouSure) {
    window.clearTimeout(clearAllTimeout!);

    blocks.clear();
    World.remove(
      world,
      world.bodies.filter((body) => !body.isStatic),
    );

    el.textContent = "Clear all and reset";
    el.dataset.areYouSure = "";

    setUniverseTime(0);
  } else {
    el.textContent = "Are you sure?";
    el.dataset.areYouSure = "1";
    clearAllTimeout = window.setTimeout(() => {
      el.textContent = "Clear all and reset";
      el.dataset.areYouSure = "";
    }, 3000);
  }
});
