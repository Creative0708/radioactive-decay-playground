import introJs from "intro.js";
import "intro.js/introjs.css";
import { addBlock, setSidebarOpen } from "./paint/sidebar";
import { extraButton } from "./paint/sidebar/extra_options";

const searchBox = document.querySelector("#search-box")! as HTMLInputElement;

let intro = introJs();

// because cookies don't work with the file uri...
Object.defineProperty(document, "cookie", {
  get() {
    return localStorage.getItem("cookie") ?? "";
  },
  set(val) {
    localStorage.setItem("cookie", val);
  },
});

export function welcome(force = false) {
  intro = intro
    .setOptions({
      keyboardNavigation: false,
      exitOnOverlayClick: false,
      dontShowAgain: true,
      steps: [
        {
          title: "Welcome! 👋",
          intro: `This is the Radioactive Decay Playground by Colin Cai. If you want to learn the controls, click "Next". If you want to go straight to the simulator, click the "X" in the top right corner.`,
        },
        {
          element: document.querySelector("#sidebar-container") as HTMLElement,
          intro: `This is the sidebar. You can search for isotopes here using their name or symbol. Try entering something like "Polonium" or "U-235".`,
        },
        {
          element: document.querySelector(
            "#fake-canvas-container",
          ) as HTMLElement,
          intro: `This is the playground. You can drag isotopes from the sidebar into here to form blocks. Once you release your mouse, the isotopes will start decaying! Isotopes will not decay when you're holding them.`,
          position: "floating",
        },
        {
          element: document.querySelector(
            "#timeshift-container",
          ) as HTMLElement,
          intro: `This is the timeshift tool. Currently, the simulation is running at real time (you can tell by the "1s = 1s" label and the clock.) You can drag the slider or use the arrow keys to change the simulation speed. This is useful when dealing with isotopes that have very long or very short half-lives. Additionally, you can press the Pause button or press space to pause/unpause the simulation. Try it out!`,
        },
        {
          element: document.querySelector("#extra-options") as HTMLElement,
          intro: `This are some extra options. The "Clear all" button will delete all the blocks (you can also activate this with the "r" key). The "Fullscreen" button will enter or exit fullscreen mode. The "Introduction" button will show this introduction again, if you need it.`,
        },
        {
          intro: `Thanks for trying out the Radioactive Decay Playground! I hope you have fun. ♥️☢️🛝`,
        },
      ],
    })
    .onbeforechange(function () {
      switch (this._currentStep) {
        case 1:
          (async () => {
            searchBox.value = "";
            for (const c of "Neptunium-226") {
              searchBox.value += c;
              searchBox.dispatchEvent(new InputEvent("input"));
              await new Promise((res) => setTimeout(res, 100));
            }
          })();
          break;
        case 2:
          // addBlock("Np-226", (innerWidth - 320) / 2 + 320, innerHeight / 2);
          break;
      }
      return true;
    })
    .onbeforeexit(() => {
      return true;
    });

  if (force) intro = intro.setDontShowAgain(false);
  intro.start();
}

addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    intro.exit(false);
  }
});

extraButton("Introduction", () => {
  welcome(true);
});
