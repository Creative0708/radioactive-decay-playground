import {
  Bodies,
  Body,
  Composite,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
} from "matter-js";
import { addResizeHook, canvas } from "./canvas";
import { TAU } from "./math";

export const engine = Engine.create();
engine.gravity.y = 2;
export const world = engine.world;

export function add(body: Body | Body[], isDragged = false) {
  Composite.add(world, body);
  if (isDragged && !Array.isArray(body)) draggedBody = body;
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
const TOP_WALL_POS = -300;

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
  Body.setPosition(
    body,
    { x: xPos + centerX, y: centerY },
    // @ts-ignore
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

let canvasWidth = 0,
  canvasHeight = 0;
addResizeHook((width, height) => {
  canvasWidth = width;
  canvasHeight = height;

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
    bottomWall,
    -WALL_WIDTH,
    height - WALL_INSET,
    width + WALL_WIDTH,
    height - (WALL_INSET - WALL_WIDTH),
  );
});

add([leftWall, rightWall, bottomWall]);

export let draggedBody: null | Body = null;

export let time: number = 0;

let lastX = 0,
  lastY = 0;
export function tick(delta: number) {
  time += delta;

  if (draggedBody && Math.abs(draggedBody.angle) > 0.01) {
    draggedBody.angle =
      draggedBody.angle - Math.round(draggedBody.angle / TAU) * TAU;
    Body.setAngularVelocity(draggedBody, -draggedBody.angle * 0.2);
  }

  const newX = screenX * 0.4,
    newY = screenY * 0.4;

  const winDeltaX = lastX - newX,
    winDeltaY = lastY - newY;

  for (const body of world.bodies) {
    if (body.isStatic) {
      if (winDeltaX || winDeltaY)
        Body.setVelocity(body, { x: -winDeltaX, y: -winDeltaY });
    } else {
      let deltaX = winDeltaX,
        deltaY = winDeltaY;
      let stopVelocity = false;
      const POSITION_LIMIT = 20;
      if (body.position.x < -POSITION_LIMIT) {
        deltaX += -POSITION_LIMIT - body.position.x;
        stopVelocity = true;
      } else if (body.position.x > canvasWidth + POSITION_LIMIT) {
        deltaX += canvasWidth + POSITION_LIMIT - body.position.x;
        stopVelocity = true;
      }
      if (body.position.y > canvasHeight + POSITION_LIMIT) {
        deltaY += canvasHeight + POSITION_LIMIT - body.position.y;
        stopVelocity = true;
      }
      if (deltaX || deltaY) Body.translate(body, { x: deltaX, y: deltaY });
      if (stopVelocity) Body.setVelocity(body, { x: 0, y: 0 });
    }
  }

  lastX = newX;
  lastY = newY;

  Engine.update(engine, Math.min(delta * 1000, 50));

  for (const wall of [leftWall, rightWall, bottomWall]) {
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
