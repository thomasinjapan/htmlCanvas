// geometry.js
// Pure geometry helpers. Points are objects of the form { x, y }.
// No canvas code in here, so these functions can be reused or tested anywhere.

// Returns the orientation of the turn a -> b -> c:
//  > 0 counter-clockwise, < 0 clockwise, 0 collinear (all on one line).
// This is the 2D cross product of (b - a) and (c - a).
function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

// Returns true if point p lies within the bounding box of segment a-b.
// Only used when p is already known to be collinear with a-b.
function onSegment(a, b, p) {
  return Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) &&
         Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
}

// Returns true if segment p1-p2 intersects segment q1-q2
// (including touching at an end point or overlapping on the same line).
function segmentsIntersect(p1, p2, q1, q2) {
  const d1 = orientation(q1, q2, p1);
  const d2 = orientation(q1, q2, p2);
  const d3 = orientation(p1, p2, q1);
  const d4 = orientation(p1, p2, q2);

  // General case: each segment's end points lie on opposite sides of the other
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Special cases: an end point lies exactly on the other segment
  if (d1 === 0 && onSegment(q1, q2, p1)) return true;
  if (d2 === 0 && onSegment(q1, q2, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, q1)) return true;
  if (d4 === 0 && onSegment(p1, p2, q2)) return true;

  return false;
}

// Returns true if point p is inside the polygon (ray casting):
// cast a ray to the right of p and count how many edges it crosses.
// An odd count means the point is inside.
function pointInPolygon(p, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    // Does edge a-b cross the horizontal line through p, to the right of p?
    if ((a.y > p.y) !== (b.y > p.y) &&
        p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

// Returns true if the line segment a-b collides with the polygon,
// i.e. it crosses or touches an edge, or lies completely inside.
function lineHitsPolygon(a, b, points) {
  // Check the segment against every edge of the polygon
  for (let i = 0; i < points.length; i++) {
    const edgeStart = points[i];
    const edgeEnd = points[(i + 1) % points.length];  // wraps back to the first point
    if (segmentsIntersect(a, b, edgeStart, edgeEnd)) return true;
  }
  // No edge crossed: the segment is either fully inside or fully outside.
  // Checking one end point is enough to tell which.
  return pointInPolygon(a, points);
}

// 2D cross product of vectors u and v (both { x, y }).
function cross(u, v) {
  return u.x * v.y - u.y * v.x;
}

// Finds where segment p1-p2 meets segment q1-q2.
// Returns t in [0, 1] = how far along p1-p2 the first contact is
// (0 = at p1, 1 = at p2), or null if the segments don't touch.
function segmentHitT(p1, p2, q1, q2) {
  const r = { x: p2.x - p1.x, y: p2.y - p1.y };   // direction of p1-p2
  const s = { x: q2.x - q1.x, y: q2.y - q1.y };   // direction of q1-q2
  const qp = { x: q1.x - p1.x, y: q1.y - p1.y };  // from p1 to q1
  const denom = cross(r, s);

  if (denom !== 0) {
    // Not parallel: solve p1 + t*r = q1 + u*s for t and u
    const t = cross(qp, s) / denom;  // position along p1-p2
    const u = cross(qp, r) / denom;  // position along q1-q2
    // Both must lie within their segment for a real intersection
    return (t >= 0 && t <= 1 && u >= 0 && u <= 1) ? t : null;
  }

  // Parallel: only a hit if both segments lie on the same line
  if (cross(qp, r) !== 0) return null;

  // Collinear: project q1 and q2 onto p1-p2 and find the overlap with [0, 1]
  const rr = r.x * r.x + r.y * r.y;
  if (rr === 0) return null;  // p1-p2 has zero length
  const t0 = (qp.x * r.x + qp.y * r.y) / rr;
  const t1 = t0 + (s.x * r.x + s.y * r.y) / rr;
  const lo = Math.max(0, Math.min(t0, t1));
  const hi = Math.min(1, Math.max(t0, t1));
  return lo <= hi ? lo : null;  // start of the overlap is the first contact
}

// Returns the first point where segment a-b touches the polygon
// (the one closest to a), or null if it doesn't touch it at all.
function firstHitOnPolygon(a, b, points) {
  // If a already starts inside the polygon, the very first point is a hit
  if (pointInPolygon(a, points)) return { x: a.x, y: a.y };

  // Otherwise test every edge and keep the smallest t (closest to a)
  let bestT = null;
  for (let i = 0; i < points.length; i++) {
    const edgeStart = points[i];
    const edgeEnd = points[(i + 1) % points.length];  // wraps back to the first point
    const t = segmentHitT(a, b, edgeStart, edgeEnd);
    if (t !== null && (bestT === null || t < bestT)) bestT = t;
  }
  if (bestT === null) return null;

  // Convert t back into a point on a-b
  return { x: a.x + (b.x - a.x) * bestT, y: a.y + (b.y - a.y) * bestT };
}

// Returns an angle that pulsates between alpha and beta degrees, back and forth.
// alpha, beta: angles in degrees
// n: duration of one complete cycle (forward and back) in seconds
// t: elapsed time in seconds
// Uses a triangle wave: goes linearly from alpha to beta in n/2 seconds,
// then back to alpha in the next n/2 seconds.
function pulsate(alpha, beta, n, t) {
  // Where are we in the cycle? [0, n) repeats forever.
  const phase = t % n;  // position in [0, n)
  
  if (phase < n / 2) {
    // First half: go from alpha to beta
    const progress = phase / (n / 2);  // [0, 1)
    return alpha + (beta - alpha) * progress;
  } else {
    // Second half: go from beta back to alpha
    const progress = (phase - n / 2) / (n / 2);  // [0, 1)
    return beta - (beta - alpha) * progress;
  }
}

// Smoother pulsation using a sine wave.
// Same parameters as pulsate(), but the motion eases in and out.
function pulsateSine(alpha, beta, n, t) {
  // Sine wave from 0 to 2π over time interval [0, n]
  const angle = (2 * Math.PI * t) / n;
  // sin(angle) goes from 0 -> 1 -> 0 -> -1 -> 0, so (1 + sin) / 2 goes 0.5 -> 1 -> 0.5 -> 0 -> 0.5
  // We want it from alpha -> beta -> alpha, so use (1 - cos) / 2 instead, which goes 0 -> 1 -> 0
  const progress = (1 - Math.cos(angle)) / 2;  // [0, 1], smooth wave
  return alpha + (beta - alpha) * progress;
}

// Converts an angle in degrees to a direction vector and scales it to a distance.
// angle: degrees (0° is right, 90° is down in standard canvas coords)
// distance: how far to go in that direction
// Returns { x, y }
function angleToPoint(angle, distance) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: distance * Math.cos(radians),
    y: distance * Math.sin(radians),
  };
}

// Convert from canvas coordinates to centered coordinates.
// Canvas: (0,0) is top-left, X right, Y down
// Centered: (0,0) is center, X right, Y up
// canvasSize: width/height of the square canvas
function canvasToCentered(canvasCoord, canvasSize) {
  return {
    x: canvasCoord.x - canvasSize / 2,
    y: canvasSize / 2 - canvasCoord.y,  // invert Y
  };
}

// Convert from centered coordinates back to canvas coordinates.
function centeredToCanvas(centeredCoord, canvasSize) {
  return {
    x: centeredCoord.x + canvasSize / 2,
    y: canvasSize / 2 - centeredCoord.y,  // invert Y
  };
}

// Convert from north-based angle system (0°=north, 90°=east, 180°=south, 270°=west)
// to canvas-based angle system (0°=east, 90°=south, etc.).
// This is used to get a point in a direction using the new angle system.
function angleToPointNorth(angleDeg, distance) {
  // 0° north = -90° in canvas coords (or equivalently 270°)
  const canvasAngle = angleDeg - 90;
  return angleToPoint(canvasAngle, distance);
}
