import { World } from "matter-js";
import { blocks, setUniverseTime } from "../../block";
import { world } from "../../matter";

const extraOptionsEl = document.getElementById("extra-options")!;

const keyListeners: { [key: string]: () => void } = {};

const extraButton = (
  name: string,
  handler: (el: HTMLElement) => void,
  key?: string,
) => {
  const buttonEl = document.createElement("button");
  buttonEl.textContent = name;
  buttonEl.addEventListener("click", () => handler(buttonEl));

  if (key) keyListeners[key] = () => handler(buttonEl);

  extraOptionsEl.appendChild(buttonEl);
};
addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.shiftKey ||
    e.ctrlKey ||
    e.altKey ||
    e.metaKey
  )
    return;
  const listener = keyListeners[e.key];
  if (listener) listener();
});

let clearAllTimeout: null | number = null;
extraButton(
  "Clear all and reset",
  (el) => {
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
  },
  "r",
);
