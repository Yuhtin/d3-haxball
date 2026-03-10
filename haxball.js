// --- Constants ---
const W = 800, H = 500;
const GOAL_W = 10, GOAL_H = 160;
const GOAL_Y = (H - GOAL_H) / 2;
const BUTTON_R = 20, BALL_R = 12;
const MAX_FORCE = 40;
const VELOCITY_THRESHOLD = 0.3;

// --- SVG Setup ---
const svg = d3.select("body").append("svg")
  .attr("width", W).attr("height", H);

// Field background
svg.append("rect")
  .attr("width", W).attr("height", H)
  .attr("fill", "#2d8a4e");

// Field border
svg.append("rect")
  .attr("x", 2).attr("y", 2)
  .attr("width", W - 4).attr("height", H - 4)
  .attr("fill", "none").attr("stroke", "white").attr("stroke-width", 2);

// Center line
svg.append("line")
  .attr("x1", W / 2).attr("y1", 0)
  .attr("x2", W / 2).attr("y2", H)
  .attr("stroke", "white").attr("stroke-width", 2).attr("opacity", 0.6);

// Center circle
svg.append("circle")
  .attr("cx", W / 2).attr("cy", H / 2).attr("r", 60)
  .attr("fill", "none").attr("stroke", "white").attr("stroke-width", 2).attr("opacity", 0.6);

// Center dot
svg.append("circle")
  .attr("cx", W / 2).attr("cy", H / 2).attr("r", 4)
  .attr("fill", "white").attr("opacity", 0.6);

// Goal areas (visual)
svg.append("rect")
  .attr("x", 0).attr("y", GOAL_Y)
  .attr("width", GOAL_W).attr("height", GOAL_H)
  .attr("fill", "white").attr("opacity", 0.8);

svg.append("rect")
  .attr("x", W - GOAL_W).attr("y", GOAL_Y)
  .attr("width", GOAL_W).attr("height", GOAL_H)
  .attr("fill", "white").attr("opacity", 0.8);

// Penalty areas
svg.append("rect")
  .attr("x", 0).attr("y", H / 2 - 110)
  .attr("width", 80).attr("height", 220)
  .attr("fill", "none").attr("stroke", "white").attr("stroke-width", 1.5).attr("opacity", 0.5);

svg.append("rect")
  .attr("x", W - 80).attr("y", H / 2 - 110)
  .attr("width", 80).attr("height", 220)
  .attr("fill", "none").attr("stroke", "white").attr("stroke-width", 1.5).attr("opacity", 0.5);

// --- Initial Positions ---
function createNodes() {
  return [
    { id: "a0", team: "a", role: "gk",     ix: 50,  iy: H / 2,       radius: BUTTON_R },
    { id: "a1", team: "a", role: "player",  ix: 250, iy: H / 2 - 100, radius: BUTTON_R },
    { id: "a2", team: "a", role: "player",  ix: 250, iy: H / 2,       radius: BUTTON_R },
    { id: "a3", team: "a", role: "player",  ix: 250, iy: H / 2 + 100, radius: BUTTON_R },
    { id: "b0", team: "b", role: "gk",     ix: 750, iy: H / 2,       radius: BUTTON_R },
    { id: "b1", team: "b", role: "player",  ix: 550, iy: H / 2 - 100, radius: BUTTON_R },
    { id: "b2", team: "b", role: "player",  ix: 550, iy: H / 2,       radius: BUTTON_R },
    { id: "b3", team: "b", role: "player",  ix: 550, iy: H / 2 + 100, radius: BUTTON_R },
    { id: "ball", team: null, role: "ball",  ix: W / 2, iy: H / 2,    radius: BALL_R },
  ].map(d => ({ ...d, x: d.ix, y: d.iy, vx: 0, vy: 0 }));
}

let nodes = createNodes();

// --- Rendering ---
const gNodes = svg.append("g").attr("class", "nodes");

function render() {
  const circles = gNodes.selectAll("circle").data(nodes, d => d.id);

  circles.enter()
    .append("circle")
    .attr("r", d => d.radius)
    .attr("fill", d => {
      if (d.role === "ball") return "#f0f0f0";
      return d.team === "a" ? "#e63946" : "#457b9d";
    })
    .attr("stroke", d => {
      if (d.role === "ball") return "#999";
      return d.team === "a" ? "#9b1d2a" : "#2a4d61";
    })
    .attr("stroke-width", d => d.role === "ball" ? 1.5 : 2.5)
    .merge(circles)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);

  // Button labels
  const labels = gNodes.selectAll("text").data(nodes.filter(d => d.role !== "ball"), d => d.id);

  labels.enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", 11)
    .attr("font-weight", "bold")
    .attr("fill", "white")
    .attr("pointer-events", "none")
    .text(d => d.role === "gk" ? "GK" : d.id.slice(1))
    .merge(labels)
    .attr("x", d => d.x)
    .attr("y", d => d.y);
}

render();

// --- Custom Force: Bounce off walls ---
function forceBounds() {
  let nodes;
  function force() {
    for (const d of nodes) {
      const inGoalY = d.y > GOAL_Y && d.y < GOAL_Y + GOAL_H;

      if (d.x - d.radius < 0) {
        if (d.id !== "ball" || !inGoalY) {
          d.x = d.radius;
          d.vx = Math.abs(d.vx) * 0.8;
        }
      }
      if (d.x + d.radius > W) {
        if (d.id !== "ball" || !inGoalY) {
          d.x = W - d.radius;
          d.vx = -Math.abs(d.vx) * 0.8;
        }
      }
      if (d.y - d.radius < 0) {
        d.y = d.radius;
        d.vy = Math.abs(d.vy) * 0.8;
      }
      if (d.y + d.radius > H) {
        d.y = H - d.radius;
        d.vy = -Math.abs(d.vy) * 0.8;
      }
    }
  }
  force.initialize = function(_) { nodes = _; };
  return force;
}

function forceElasticCollision() {
  let nodes;
  function force() {
    const ball = nodes.find(d => d.id === "ball");
    if (!ball) return;

    for (const d of nodes) {
      if (d === ball) continue;

      const dx = ball.x - d.x;
      const dy = ball.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = ball.radius + d.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        const dvx = d.vx - ball.vx;
        const dvy = d.vy - ball.vy;
        const dvn = dvx * nx + dvy * ny;

        if (dvn > 0) {
          const impulse = dvn * 1.8;
          ball.vx += nx * impulse;
          ball.vy += ny * impulse;
          d.vx -= nx * impulse * 0.3;
          d.vy -= ny * impulse * 0.3;
        }
      }
    }
  }
  force.initialize = function(_) { nodes = _; };
  return force;
}

const simulation = d3.forceSimulation(nodes)
  .velocityDecay(0.02)
  .alphaDecay(0)
  .force("collide", d3.forceCollide(d => d.radius + 1).strength(1).iterations(3))
  .force("elastic", forceElasticCollision())
  .force("bounds", forceBounds())
  .on("tick", () => {
    render();
    checkGoal();
    checkMovement();
  });

simulation.stop();

// --- Game State ---
let currentTeam = "a";
let waitingForStop = false;

function checkMovement() {
  if (!waitingForStop) return;
  const moving = nodes.some(d => Math.abs(d.vx) > VELOCITY_THRESHOLD || Math.abs(d.vy) > VELOCITY_THRESHOLD);
  if (!moving) {
    waitingForStop = false;
    simulation.stop();
    nodes.forEach(d => { d.vx = 0; d.vy = 0; });
    switchTurn();
  }
}

function switchTurn() {
  currentTeam = currentTeam === "a" ? "b" : "a";
  updateTurnIndicator();
  updateDraggable();
}

// --- Aim Line ---
const aimLine = svg.append("line")
  .attr("stroke", "white")
  .attr("stroke-width", 2)
  .attr("stroke-dasharray", "6,4")
  .attr("opacity", 0)
  .attr("pointer-events", "none");

// --- Power Indicator ---
const powerCircle = svg.append("circle")
  .attr("fill", "none")
  .attr("stroke", "yellow")
  .attr("stroke-width", 1.5)
  .attr("stroke-dasharray", "4,3")
  .attr("opacity", 0)
  .attr("pointer-events", "none");

// --- Drag (Flick) ---
const drag = d3.drag()
  .on("start", function(event, d) {
    if (d.team !== currentTeam || waitingForStop) return;
    d.dragStartX = event.x;
    d.dragStartY = event.y;    

    d3.select(this).attr("opacity", 0.7);
  })
  .on("drag", function(event, d) {
    if (d.team !== currentTeam || !("dragStartX" in d)) return;
    const dx = d.x - event.x;
    const dy = d.y - event.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    const clampedMag = Math.min(mag, MAX_FORCE * 3);
    const nx = mag > 0 ? dx / mag : 0;
    const ny = mag > 0 ? dy / mag : 0;

    aimLine
      .attr("x1", d.x).attr("y1", d.y)
      .attr("x2", d.x + nx * clampedMag)
      .attr("y2", d.y + ny * clampedMag)
      .attr("stroke", clampedMag > MAX_FORCE * 2 ? "#ff4444" : clampedMag > MAX_FORCE ? "#ffaa00" : "#44ff44")
      .attr("opacity", 0.8);

    const power = clampedMag / (MAX_FORCE * 3);
    powerCircle
      .attr("cx", d.x).attr("cy", d.y)
      .attr("r", d.radius + power * 30)      
      .attr("stroke", power > 0.7 ? "#ff4444" : power > 0.4 ? "#ffaa00" : "#44ff44");

    powerCircle.attr("opacity", 0.6);
  })
  .on("end", function(event, d) {
    if (d.team !== currentTeam || !("dragStartX" in d)) return;
    aimLine.attr("opacity", 0);
    powerCircle.attr("opacity", 0);
    d3.select(this).attr("opacity", 1);

    const dx = d.x - event.x;
    const dy = d.y - event.y;
    const mag = Math.sqrt(dx * dx + dy * dy);

    if (mag < 5) {
      delete d.dragStartX;
      delete d.dragStartY;
      return;
    }

    const clampedMag = Math.min(mag, MAX_FORCE * 3);
    const scale = Math.min(clampedMag / 3, MAX_FORCE);
    d.vx = (dx / mag) * scale;
    d.vy = (dy / mag) * scale;

    delete d.dragStartX;
    delete d.dragStartY;

    waitingForStop = true;
    simulation.alpha(1).restart();
  });

function updateDraggable() {
  gNodes.selectAll("circle")
    .style("cursor", d => d.team === currentTeam ? "grab" : "default")
    .on(".drag", null);

  gNodes.selectAll("circle")
    .filter(d => d.team === currentTeam)
    .call(drag);
}

updateDraggable();

// --- Score ---
let score = { a: 0, b: 0 };

const scoreText = svg.append("text")
  .attr("x", W / 2).attr("y", 30)
  .attr("text-anchor", "middle")
  .attr("font-family", "sans-serif")
  .attr("font-size", 28)
  .attr("font-weight", "bold")
  .attr("fill", "white")
  .attr("opacity", 0.9);

function updateScore() {
  scoreText.text(`${score.a}  -  ${score.b}`);
}

updateScore();

// --- Turn Indicator ---
const turnText = svg.append("text")
  .attr("x", W / 2).attr("y", H - 15)
  .attr("text-anchor", "middle")
  .attr("font-family", "sans-serif")
  .attr("font-size", 16)
  .attr("fill", "white")
  .attr("opacity", 0.7);

function updateTurnIndicator() {
  const color = currentTeam === "a" ? "#e63946" : "#457b9d";
  const name = currentTeam === "a" ? "Vermelho" : "Azul";
  turnText.text(`Vez: ${name}`).attr("fill", color);

  gNodes.selectAll("circle")
    .attr("filter", d => d.team === currentTeam ? "url(#glow)" : "none");
}

// Glow filter
const defs = svg.append("defs");
const glowFilter = defs.append("filter").attr("id", "glow");
glowFilter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
glowFilter.append("feMerge")
  .selectAll("feMergeNode")
  .data(["blur", "SourceGraphic"])
  .enter().append("feMergeNode")
  .attr("in", d => d);

updateTurnIndicator();

// --- Goal Detection ---
function checkGoal() {
  const ball = nodes.find(d => d.id === "ball");
  const inGoalY = ball.y > GOAL_Y && ball.y < GOAL_Y + GOAL_H;

  if (ball.x - ball.radius < GOAL_W && inGoalY) {
    goalScored("b");
  } else if (ball.x + ball.radius > W - GOAL_W && inGoalY) {
    goalScored("a");
  }
}

function goalScored(team) {
  simulation.stop();
  waitingForStop = false;
  score[team]++;
  updateScore();

  svg.append("text")
    .attr("x", W / 2).attr("y", H / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", 64)
    .attr("font-weight", "bold")
    .attr("fill", "white")
    .attr("opacity", 1)
    .text("GOL!")
    .transition().duration(1500)
    .remove();

  setTimeout(() => {
    resetPositions();
    currentTeam = team === "a" ? "b" : "a";
    updateTurnIndicator();
    updateDraggable();
  }, 1500);
}

function resetPositions() {
  const initial = createNodes();
  nodes.forEach((node, i) => {
    node.x = initial[i].x;
    node.y = initial[i].y;
    node.vx = 0;
    node.vy = 0;
  });
  render();
}
