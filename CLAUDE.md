# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small browser canvas "game" — a radar/scanner demo written in vanilla JavaScript.
A player ship sits at the canvas center; obstacles (a square and a triangle) move and
rotate relative to the ship, and two line-of-sight "scanners" cast rays that stop when
they hit an obstacle.

## Running

No build step, no dependencies, no tests. The scripts are plain (non-module) `<script>`
tags so the page works from `file://`.

- Open `canvas/canvas.html` directly in a browser.

Controls: arrow keys move (relative to ship heading), `Q`/`E` rotate the ship,
`D` toggles debug mode (which draws the obstacle polygons).

## Architecture

Three files loaded in order (order matters — `main.js` depends on the other two, so it
loads last):

- **`canvas/geometry.js`** — pure geometry, no canvas/DOM. Segment intersection
  (`segmentsIntersect`, `segmentHitT`), ray-vs-polygon first-hit (`firstHitOnPolygon`),
  point-in-polygon, angle/time helpers (`pulsate`, `angleToPointNorth`), and the
  coordinate-system converters. Keep this file free of rendering code.
- **`canvas/draw.js`** — thin canvas drawing wrappers (`drawLine`, `drawPolygon`,
  `drawDot`). Each takes `ctx` as its first argument.
- **`canvas/main.js`** — all state, input handling, and the render loop
  (`setInterval(render, 1000/FPS)` at 30 fps). Owns the game state: `playerPos`,
  `shipRotation`, obstacle polygons, scanner state.

### Two coordinate systems (the key thing to understand)

Everything in geometry/collision runs in **canvas coordinates** (origin top-left, Y down).
Game logic authors shapes in **centered coordinates** (origin at canvas center, Y up).
Convert with `centeredToCanvas` / `canvasToCentered` (in `geometry.js`). Shapes are
defined as `*Centered` arrays and mapped through `centeredToCanvas` before drawing.

### Ship-relative world (inverse transform)

The ship never moves on screen — it's fixed at the canvas center. Instead, `updateObstacles()`
applies the **inverse** of the player's movement and rotation to every obstacle each frame:
obstacles translate by `-playerPos` and rotate by `-shipRotation`. Arrow-key input is a
movement vector in the ship's local frame, rotated by `shipRotation` into world space before
being added to `playerPos`. When changing movement/rotation, remember the sign is inverted
on the obstacle side.

### Angle conventions (two of them)

- `angleToPoint(angle, …)` uses canvas angles: 0°=east, 90°=south.
- `angleToPointNorth(angle, …)` uses the game's north-based system: 0°=north, 90°=east,
  180°=south, 270°=west. The scanner sweep uses the north-based system.

### Scanner sweep

The blue scanner sweeps -90°→90° via a triangle-wave `pulsate()`, quantized to whole degrees.
`scannerHits` accumulates one dot per scanned degree; the cycle-wrap detection (last angle > 45
and current < -45) clears the accumulated dots to start a fresh sweep. The gap-filling loop scans
every integer degree between the previous and current angle so fast sweeps don't leave holes.
