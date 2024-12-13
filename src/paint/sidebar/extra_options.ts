import { World } from "matter-js";
import { blocks } from "../../block";
import { world } from "../../matter";

const extraOptionsEl = document.getElementById("extra-options")!;

const extraButton = (name: string, handler: (el: HTMLElement) => void) => {
  const buttonEl = document.createElement("button");
  buttonEl.textContent = name;
  buttonEl.addEventListener("click", () => handler(buttonEl));

  extraOptionsEl.appendChild(buttonEl);
};

let clearAllTimeout: null | number = null;
extraButton("Clear all", (el) => {
  // using textContent as a sorta state machine
  if (el.textContent === "Are you sure?") {
    window.clearTimeout(clearAllTimeout!);

    blocks.clear();
    World.remove(
      world,
      world.bodies.filter((body) => !body.isStatic),
    );

    el.textContent = "Clear all";
  } else {
    el.textContent = "Are you sure?";
    clearAllTimeout = window.setTimeout(() => {
      el.textContent = "Clear all";
    }, 3000);
  }
});
