import { Body, Query } from "matter-js";
import * as matter from "../../matter";
import { ctx } from "../../canvas";
import { render } from "..";
import { Block, blocks } from "../../block";
import { getDarkColorForIsotope, rgbToHex } from "../../util";
import data from "../../data";

enum BlockMouseState {
  NONE,
  HOVERED,
  DRAGGED,
}

export function paint() {
  const bodies = matter.world.bodies;

  let hoveredBody: null | Body = null;
  if (!matter.draggedBody && isFinite(render.mouseX)) {
    hoveredBody = Query.point(bodies, {
      x: render.mouseX,
      y: render.mouseY,
    })[0];
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const body of bodies) {
    const block = blocks.get(body.id);
    // walls count as bodies so ignore them if they're not in the map
    if (!block) continue;

    ctx.translate(body.position.x, body.position.y);
    const ROUNDING_CONSTANT = 512 / Math.PI;
    ctx.rotate(Math.round(body.angle * ROUNDING_CONSTANT) / ROUNDING_CONSTANT);

    const blockState =
      body === matter.draggedBody
        ? BlockMouseState.DRAGGED
        : body === hoveredBody
          ? BlockMouseState.HOVERED
          : BlockMouseState.NONE;

    paintBlock(block, blockState);
    if (blockState === BlockMouseState.HOVERED) {
    }

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
      matter.leftWallPos,
      render.height - matter.WALL_INSET,
      render.width - matter.leftWallPos,
      matter.WALL_INSET,
    );
  }

  matter.tick(render.delta);
}

function paintBlock(block: Block, blockState: BlockMouseState) {
  // also used for if this is being painted back-to-front
  const isDragged = blockState === BlockMouseState.DRAGGED;
  if (!isDragged) {
    block.tick(render.delta);
  }

  const { width, height } = block;

  // element with the maximum composition
  const [approxSym, approxPortion] = Object.entries(
    block.composition.isotopes,
  ).reduce((a, b) => (a[1] > b[1] ? a : b));

  const drawBackground = () => {
    const transform = ctx.getTransform();
    ctx.translate(-width / 2, -height / 2);

    const [r, g, b] = getDarkColorForIsotope(approxSym);
    ctx.strokeStyle = rgbToHex(r, g, b);

    if (!isDragged) {
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
    }

    const backgroundColorBump =
      blockState === BlockMouseState.HOVERED ? 150 : 128;

    let portion = 0;
    for (const sym in block.composition.isotopes) {
      const widthOfSym = block.composition.isotopes[sym] * width;

      const [r, g, b] = getDarkColorForIsotope(sym);
      ctx.fillStyle = rgbToHex(
        r + backgroundColorBump,
        g + backgroundColorBump,
        b + backgroundColorBump,
      );

      if (isDragged) {
        ctx.fillRect(portion, 0, width - portion, height);
      } else {
        ctx.fillRect(0, 0, portion + widthOfSym, height);
      }

      portion += widthOfSym;
    }
    if (isDragged) {
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
    }

    ctx.setTransform(transform);
  };

  if (isDragged) {
    ctx.globalCompositeOperation = "source-over";
    drawBackground();
  }

  {
    ctx.fillStyle = "#444";
    if (approxPortion > 0.7) {
      const [sym, mass] = approxSym.split("-");

      ctx.font = "30px" + render.font;
      ctx.fillText(sym, 0, -22);
      ctx.font = "15px" + render.font;
      ctx.fillText(mass, 0, 8);
    } else {
      ctx.font = "40px" + render.font;
      ctx.fillText("~", 0, -18);
    }
  }

  if (isDragged) {
    ctx.globalCompositeOperation = "destination-over";
  } else {
    drawBackground();
  }
}
