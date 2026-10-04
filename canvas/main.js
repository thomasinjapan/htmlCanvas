// main.js
// Page setup: state, rendering and mouse handling for canvas.html.
// Uses functions from geometry.js and draw.js, which must be loaded first.

// Get the canvas and its 2D drawing context.
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: false });

// Textbox that displays the mouse coordinates
const coords = document.getElementById("coords");

// Canvas size
const CANVAS_SIZE = 800;

// CENTERED COORDINATE SYSTEM: (0,0) is canvas center, X right, Y up
// Origin at the center of the canvas
const originCentered = { x: 0, y: 0 };
const origin = centeredToCanvas(originCentered, CANVAS_SIZE);

// Square from (-50,-50) to (50,50) - a 100x100 square, shifted 300px right and top
const squareCentered = [
  { x: 250, y: 250 },
  { x: 250, y: 350 },
  { x: 350, y: 350 },
  { x: 350, y: 250 },
];

// Triangle shifted 300px right and top
const triangleCentered = [
  { x: 380,  y: 200 },
  { x: 420,  y: 240 },
  { x: 200,  y: 400 },
];

// Convert to canvas coordinates for rendering (these will be adjusted by player movement)
let square = squareCentered.map(p => centeredToCanvas(p, CANVAS_SIZE));
let triangle = triangleCentered.map(p => centeredToCanvas(p, CANVAS_SIZE));

// Player ship position and rotation
let playerPos = { x: 0, y: 0 };
let shipRotation = 0;  // degrees: 0=north, 90=east, 180=south, 270=west
const moveSpeed = 5;  // pixels per frame in centered coords
const rotationSpeed = 2;  // degrees per frame

// Fill colors: red when the line touches a polygon, green otherwise
const hitColor = "red";
const missColor = "green";

// Second line: pulsates from -90° (west) to 90° (east) clockwise in 1° steps
const alphaDeg = -90;  // start: west
const betaDeg = 90;    // end: east
const pulsateDuration = 2;  // seconds for one complete cycle (-90 -> 90 -> -90)
const startTime = Date.now();  // animation starts when page loads

// Debug mode: press D to toggle polygon visibility (starts disabled)
let debugMode = false;

// Latest mouse position (updated by mousemove, used by render)
// Initialize to a visible position in centered coords: (200, 200)
let mouseCentered = { x: 200, y: 200 };
let mouse = centeredToCanvas(mouseCentered, CANVAS_SIZE);

// Scanner hits: store scan data (point and color) for each degree
const scannerHits = {};  // { angle: {point, color} }
let lastScanAngle = alphaDeg;  // track the last scanner angle

// Rotate a point around the origin by angle degrees (counter-clockwise in centered coords)
function rotatePoint(point, angleDeg) {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

// Update polygon positions based on player movement and rotation
// As the player moves, obstacles translate (opposite direction)
// As the player rotates, obstacles rotate around the player (opposite direction)
function updateObstacles() {
  // Apply inverse rotation and translation
  const inverseRotation = -shipRotation;
  
  // Translate and rotate all polygon points
  square = squareCentered.map(p => {
    // Translate by negative player position
    const translated = { x: p.x - playerPos.x, y: p.y - playerPos.y };
    // Rotate by inverse ship rotation
    const rotated = rotatePoint(translated, inverseRotation);
    return centeredToCanvas(rotated, CANVAS_SIZE);
  });
  triangle = triangleCentered.map(p => {
    const translated = { x: p.x - playerPos.x, y: p.y - playerPos.y };
    const rotated = rotatePoint(translated, inverseRotation);
    return centeredToCanvas(rotated, CANVAS_SIZE);
  });
}

// Redraws the canvas: clears it, draws both polygons (if debug), then the lines.
function render() {
  // Handle player movement from arrow keys, relative to ship rotation
  // Arrow keys move in the ship's local frame, not the world frame
  let moveVector = { x: 0, y: 0 };
  
  if (keysPressed["ArrowUp"]) {
    moveVector.y += moveSpeed;  // forward (ship's forward direction)
  }
  if (keysPressed["ArrowDown"]) {
    moveVector.y -= moveSpeed;  // backward
  }
  if (keysPressed["ArrowLeft"]) {
    moveVector.x -= moveSpeed;  // left
  }
  if (keysPressed["ArrowRight"]) {
    moveVector.x += moveSpeed;  // right
  }
  
  // Rotate movement vector by ship rotation to get world-space movement
  if (moveVector.x !== 0 || moveVector.y !== 0) {
    const rotatedMove = rotatePoint(moveVector, shipRotation);
    playerPos.x += rotatedMove.x;
    playerPos.y += rotatedMove.y;
  }
  
  // Handle ship rotation with Q and E
  // E rotates ship clockwise -> obstacles rotate counter-clockwise around player
  // Q rotates ship counter-clockwise -> obstacles rotate clockwise around player
  if (keysPressed["e"] || keysPressed["E"]) {
    shipRotation -= rotationSpeed;  // ship rotates clockwise (obstacles rotate counter-clockwise)
  }
  if (keysPressed["q"] || keysPressed["Q"]) {
    shipRotation += rotationSpeed;  // ship rotates counter-clockwise (obstacles rotate clockwise)
  }
  
  // Normalize rotation to [0, 360)
  shipRotation = ((shipRotation % 360) + 360) % 360;
  
  // Update obstacle positions based on player movement
  updateObstacles();
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);  // erase the old frame
  
  // Check collision with both polygons (first line)
  const hitSquare = firstHitOnPolygon(origin, mouse, square);
  const hitTriangle = firstHitOnPolygon(origin, mouse, triangle);
  
  // Find which polygon (if any) is hit first by the first line (closest to origin)
  let end = mouse;
  let hitPolygon = null;
  
  if (hitTriangle && hitSquare) {
    const distTriangle = (hitTriangle.x - origin.x) ** 2 + (hitTriangle.y - origin.y) ** 2;
    const distSquare = (hitSquare.x - origin.x) ** 2 + (hitSquare.y - origin.y) ** 2;
    if (distTriangle < distSquare) {
      end = hitTriangle;
      hitPolygon = "triangle";
    } else {
      end = hitSquare;
      hitPolygon = "square";
    }
  } else if (hitTriangle) {
    end = hitTriangle;
    hitPolygon = "triangle";
  } else if (hitSquare) {
    end = hitSquare;
    hitPolygon = "square";
  }
  
  // Draw polygons only in debug mode
  if (debugMode) {
    const triangleColor = hitPolygon === "triangle" ? hitColor : missColor;
    drawPolygon(ctx, triangle, triangleColor);
    
    const squareColor = hitPolygon === "square" ? hitColor : missColor;
    drawPolygon(ctx, square, squareColor);
  }
  
  // Draw the first line (black) and a dot where it hits (orange)
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  drawLine(ctx, origin, end);
  if (hitPolygon) {
    drawDot(ctx, end, 5, "orange");
  }
  
  // Second line: pulsates from -90° (west) to 90° (east) relative to ship
  const elapsedTime = (Date.now() - startTime) / 1000;  // seconds since page load
  const gammaContinuous = pulsate(alphaDeg, betaDeg, pulsateDuration, elapsedTime);
  const gamma = Math.round(gammaContinuous);  // quantize to whole degrees (always relative to ship)
  
  // Detect when a cycle completes (gamma wraps: was near 90, now near -90)
  if (lastScanAngle > 45 && gamma < -45) {
    // Cycle wrap detected: clear all old dots from previous cycle
    for (const key in scannerHits) {
      delete scannerHits[key];
    }
  }
  
  // Scan every degree from last angle to current angle (fills in the gaps)
  const startDeg = lastScanAngle > gamma ? lastScanAngle : gamma;  // handle wrap-around
  const endDeg = lastScanAngle > gamma ? gamma : lastScanAngle;
  const degreesToScan = [];
  
  if (lastScanAngle > 45 && gamma < -45) {
    // Wrap-around: scan from lastScanAngle down to -90, then from 90 down to gamma
    for (let d = Math.round(lastScanAngle); d >= -90; d--) {
      degreesToScan.push(d);
    }
    for (let d = 90; d >= Math.round(gamma); d--) {
      degreesToScan.push(d);
    }
  } else if (lastScanAngle <= gamma) {
    // Normal forward sweep
    for (let d = Math.round(lastScanAngle); d <= Math.round(gamma); d++) {
      degreesToScan.push(d);
    }
  } else {
    // Backward sweep
    for (let d = Math.round(lastScanAngle); d >= Math.round(gamma); d--) {
      degreesToScan.push(d);
    }
  }
  
  // Perform a scan for each degree
  let end2 = null;
  let hitScanner = false;
  for (const scanDeg of degreesToScan) {
    const offset = angleToPointNorth(scanDeg, 800);  // long enough to reach canvas corners
    const scanPoint = { x: origin.x + offset.x, y: origin.y + offset.y };
    
    // Check where this scan hits polygons
    const scanTriangle = firstHitOnPolygon(origin, scanPoint, triangle);
    const scanSquare = firstHitOnPolygon(origin, scanPoint, square);
    
    // Pick the closer hit point, or use scanPoint if no hit
    let scanEnd = scanPoint;
    let scanHit = false;
    if (scanTriangle && scanSquare) {
      const distTriangle = (scanTriangle.x - origin.x) ** 2 + (scanTriangle.y - origin.y) ** 2;
      const distSquare = (scanSquare.x - origin.x) ** 2 + (scanSquare.y - origin.y) ** 2;
      scanEnd = distTriangle < distSquare ? scanTriangle : scanSquare;
      scanHit = true;
    } else if (scanTriangle) {
      scanEnd = scanTriangle;
      scanHit = true;
    } else if (scanSquare) {
      scanEnd = scanSquare;
      scanHit = true;
    }
    
    // Store a dot for this scan
    const dotColor = scanHit ? "blue" : "rgba(100, 100, 255, 0.3)";
    scannerHits[scanDeg] = { point: scanEnd, color: dotColor };
    
    // Keep the last scan for drawing the live line
    end2 = scanEnd;
    hitScanner = scanHit;
  }
  
  // Draw the second line (blue radar sweep - stops at obstacles)
  if (end2) {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 1;
    drawLine(ctx, origin, end2);
  }
  
  // Draw thin lines connecting consecutive scan dots
  const angles = Object.keys(scannerHits).map(Number).sort((a, b) => a - b);
  if (angles.length > 1) {
    ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";  // semi-transparent blue
    ctx.lineWidth = 1;
    ctx.beginPath();
    const firstPoint = scannerHits[angles[0]].point;
    ctx.moveTo(firstPoint.x, firstPoint.y);
    for (let i = 1; i < angles.length; i++) {
      const point = scannerHits[angles[i]].point;
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
  
  // Draw 2px dots for every scan from the current cycle
  for (const scanData of Object.values(scannerHits)) {
    drawDot(ctx, scanData.point, 1, scanData.color);  // 2px diameter
  }
  
  lastScanAngle = gamma;
  coords.value = `x: ${mouseCentered.x.toFixed(0)}, y: ${mouseCentered.y.toFixed(0)}`;
}

// Track which keys are currently pressed
const keysPressed = {};

document.addEventListener("keydown", (e) => {
  keysPressed[e.key] = true;
  if (e.key === 'd' || e.key === 'D') {
    debugMode = !debugMode;
    console.log(`Debug mode: ${debugMode ? "ON" : "OFF"}`);
  }
});

document.addEventListener("keyup", (e) => {
  keysPressed[e.key] = false;
});

// Track the mouse whenever it moves over the canvas
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  mouseCentered = canvasToCentered(mouse, CANVAS_SIZE);
});

// Start the animation loop: render at 30 fps
const FPS = 30;
setInterval(render, 1000 / FPS);

console.log("Game initialized. Use arrow keys to move. Press D to toggle debug mode.");
