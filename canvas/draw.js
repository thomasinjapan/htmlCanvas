// draw.js
// Drawing helpers. Each function takes the 2D context (ctx) as its first
// argument, so it works with any canvas on the page.

// Draws a straight line from point a to point b.
// a and b are objects of the form { x, y } in canvas pixels.
function drawLine(ctx, a, b) {
  ctx.beginPath();          // start a new path
  ctx.moveTo(a.x, a.y);     // move the pen to the start point
  ctx.lineTo(b.x, b.y);     // add a line segment to the end point
  ctx.stroke();             // actually draw the path
}

// Draws a closed polygon through the given points and fills it.
// points is an array of { x, y } objects (at least 3),
// color is any CSS color, e.g. "steelblue" or "#ff0000".
function drawPolygon(ctx, points, color) {
  ctx.beginPath();                            // start a new path
  ctx.moveTo(points[0].x, points[0].y);       // start at the first point
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);     // connect each following point
  }
  ctx.closePath();                            // connect the last point back to the first
  ctx.fillStyle = color;                      // set the fill color
  ctx.fill();                                 // fill the polygon
}

// Draws a filled circle (dot) at the given point.
// point is { x, y } in canvas pixels, radius in pixels, color is any CSS color.
function drawDot(ctx, point, radius, color) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);  // full circle
  ctx.fillStyle = color;
  ctx.fill();
}
