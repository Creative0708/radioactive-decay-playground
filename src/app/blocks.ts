import { Composite, Engine } from "matter-js";
import * as matter from "../matter";
import { ctx } from "../canvas";
import { render } from ".";
import { Block, blocks } from "../block";
import { getDarkColorForElement, rgbToHex } from "../util";
import data from "../data";

export function paint() {
  const bodies = Composite.allBodies(matter.world);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const body of bodies) {
    const block = blocks.get(body.id);
    if (!block) continue;

    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    drawBlock(block, body === matter.draggedBody);

    ctx.resetTransform();

    const vertices = body.vertices;

    for (let j = 0; j < vertices.length; j++) {
      const vertex = vertices[j];
      ctx[j == 0 ? "moveTo" : "lineTo"](vertex.x, vertex.y);
    }
  }

  // walls
  {
    ctx.fillStyle = "#222";
    // left
    ctx.fillRect(matter.leftWallPos, 0, matter.WALL_INSET, render.height);
    // right
    ctx.fillRect(
      render.width - matter.WALL_INSET,
      0,
      matter.WALL_INSET,
      render.height,
    );
    // bottom
    ctx.fillRect(
      0,
      render.height - matter.WALL_INSET,
      render.width,
      matter.WALL_INSET,
    );
  }

  matter.tick(render.delta);
}

function drawBlock(block: Block, isDragged: boolean) {
  const { width, height } = block;

  // approximate element
  const [element, portion] = Object.entries(block.composition).reduce((a, b) =>
    a[1] > b[1] ? a : b,
  );

  const drawBackground = () => {
    let portion = -width / 2;
    for (const sym in block.composition) {
      const widthOfSym = block.composition[sym] * width;
      const isotope = data.isotopes[sym];
      const elem = data.elements[isotope.protons];

      const [r, g, b] = getDarkColorForElement(elem);
      ctx.fillStyle = rgbToHex(r + 128, g + 128, b + 128);
      ctx.strokeStyle = rgbToHex(r, g, b);

      const BORDER_WIDTH = 2;
      ctx.lineWidth = BORDER_WIDTH;
      ctx.fillRect(portion, -height / 2, widthOfSym, height);
      ctx.strokeRect(
        portion - BORDER_WIDTH / 2,
        -height / 2 - BORDER_WIDTH / 2,
        widthOfSym + BORDER_WIDTH,
        height + BORDER_WIDTH,
      );

      portion += widthOfSym;
    }
  };

  if (isDragged) {
    ctx.globalCompositeOperation = "source-over";
    drawBackground();
  }

  {
    if (portion > 0.7) {
      const [sym, mass] = element.split("-");
      ctx.fillStyle = "#444";

      ctx.font = "30px" + render.font;
      ctx.fillText(sym, 0, -22);
      ctx.font = "15px" + render.font;
      ctx.fillText(mass, 0, 8);
    }
  }

  if (isDragged) {
    ctx.globalCompositeOperation = "destination-over";
  } else {
    drawBackground();
  }
}
