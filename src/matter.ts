import {
  Bodies,
  Body,
  Composite,
  Composites,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Vector,
  Vertices,
  World,
} from "matter-js";
import { addResizeHook, canvas } from "./canvas";

export const engine = Engine.create();
engine.gravity.y = 2;
export const world = engine.world;

export function add(body: Body | Body[]) {
  Composite.add(world, body);
}
export function remove(body: Body | Body[]) {
  Composite.remove(world, body);
}

export const WALL_CATEGORY = 1 << 8;

const mouse = Mouse.create(canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: {
    stiffness: 0.2,
    damping: 0.5,
    render: {
      visible: false,
    },
  },
  collisionFilter: {
    mask: ~WALL_CATEGORY,
  },
});

Composite.add(world, mouseConstraint);

const WALL_WIDTH = 500;
export const WALL_INSET = 10;
const TOP_WALL_POS = -1000;

function wallBody() {
  return Body.create({
    isStatic: true,
    restitution: 1,

    collisionFilter: {
      group: -1,
      category: WALL_CATEGORY,
    },
  });
}

export const leftWall = wallBody();
export const rightWall = wallBody();
export const topWall = wallBody();
export const bottomWall = wallBody();

// hack to make sidebar work
export let leftWallPos = 0;
export function setLeftWallPos(pos: number) {
  Body.setPosition(
    leftWall,
    {
      x: leftWall.position.x + pos - leftWallPos,
      y: leftWall.position.y,
    },
    // matter-js does have a third argument for setPosition but the types don't have it for some reason
    // https://github.com/liabru/matter-js/blob/master/src/body/Body.js#L484
    // @ts-ignore
    true,
  );
  leftWallPos = pos;
}

function setAxisAlignedVertices(
  body: Body,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const xPos = body === leftWall ? leftWallPos : 0;

  const centerX = (x1 + x2) / 2,
    centerY = (y1 + y2) / 2;
  // @ts-ignore
  Body.setPosition(
    body,
    { x: xPos + centerX, y: centerY },
    body === leftWall || body === rightWall,
  );

  x1 -= centerX;
  x2 -= centerX;
  y1 -= centerX;
  y2 -= centerX;

  Body.setVertices(body, [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ]);
}

addResizeHook((width, height) => {
  setAxisAlignedVertices(
    leftWall,
    WALL_INSET - WALL_WIDTH,
    TOP_WALL_POS - WALL_WIDTH,
    WALL_INSET,
    height + WALL_WIDTH,
  );
  setAxisAlignedVertices(
    rightWall,
    width - WALL_INSET,
    TOP_WALL_POS - WALL_WIDTH,
    width - (WALL_INSET - WALL_WIDTH),
    height + WALL_WIDTH,
  );
  setAxisAlignedVertices(
    topWall,
    -WALL_WIDTH,
    TOP_WALL_POS - WALL_WIDTH,
    width + WALL_WIDTH,
    TOP_WALL_POS,
  );
  setAxisAlignedVertices(
    bottomWall,
    -WALL_WIDTH,
    height - WALL_INSET,
    width + WALL_WIDTH,
    height - (WALL_INSET - WALL_WIDTH),
  );
});

add([leftWall, rightWall, topWall, bottomWall]);

export let draggedBody: null | Body = null;

export function tick(delta: number) {
  Engine.update(engine, delta * 1000);

  for (const wall of [leftWall, rightWall, topWall, bottomWall]) {
    if (wall.velocity.x || wall.velocity.y) {
      Body.setVelocity(wall, { x: 0, y: 0 });
    }
  }
}

export function onMouseConstraintEvent(
  event: "startdrag" | "enddrag",
  listener: (body: Body) => void,
) {
  Events.on(mouseConstraint, event, (e) => {
    const body: Body = (e as any).body;
    listener(body);
  });
}

onMouseConstraintEvent("startdrag", (body) => {
  body.collisionFilter.mask = (body.collisionFilter.mask ?? 0) & ~WALL_CATEGORY;
  draggedBody = body;
});
onMouseConstraintEvent("enddrag", (body) => {
  body.collisionFilter.mask = (body.collisionFilter.mask ?? 0) | WALL_CATEGORY;
  draggedBody = null;
});
