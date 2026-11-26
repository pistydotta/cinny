import * as THREE from 'three';
import {
  BENCH,
  BENCH_X,
  BENCH_Z,
  SEAT_GAP,
  BOX_DEPTH,
  BOX_HALF_WIDTH,
  CIRCLE_RADIUS,
  GOAL_DEPTH,
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  HALF_LENGTH,
  HALF_WIDTH,
} from '../engine/data';

// The pitch, its lines, the goals and the stands, all drawn in code: the grass and the crowd
// are canvas textures, so the game ships no image files.

const APRON = 7;

// Grass with mowing stripes, and the markings, on one canvas covering the pitch and apron.
const pitchTexture = (renderer: THREE.WebGLRenderer): THREE.CanvasTexture => {
  const w = (HALF_LENGTH + APRON) * 2;
  const h = (HALF_WIDTH + APRON) * 2;
  const scale = 20;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const X = (x: number) => (x + HALF_LENGTH + APRON) * scale;
  const Z = (z: number) => (z + HALF_WIDTH + APRON) * scale;

  g.fillStyle = '#2f7a35';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const stripe = (HALF_LENGTH * 2) / 18;
  for (let k = 0; k < 18; k += 1) {
    g.fillStyle = k % 2 ? '#2f7a35' : '#388a3e';
    g.fillRect(X(-HALF_LENGTH + k * stripe), Z(-HALF_WIDTH - APRON), stripe * scale + 1, h * scale);
  }
  // A little noise so the grass isn't flat.
  for (let k = 0; k < 9000; k += 1) {
    g.fillStyle = `rgba(${k % 2 ? '255,255,255' : '0,0,0'},0.035)`;
    g.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 3, 3);
  }

  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = 0.12 * scale;
  g.strokeRect(X(-HALF_LENGTH), Z(-HALF_WIDTH), HALF_LENGTH * 2 * scale, HALF_WIDTH * 2 * scale);
  g.beginPath();
  g.moveTo(X(0), Z(-HALF_WIDTH));
  g.lineTo(X(0), Z(HALF_WIDTH));
  g.stroke();
  g.beginPath();
  g.arc(X(0), Z(0), CIRCLE_RADIUS * scale, 0, Math.PI * 2);
  g.stroke();
  [-1, 1].forEach((end) => {
    const gx = end * HALF_LENGTH;
    const box = (depth: number, half: number) =>
      g.strokeRect(X(end > 0 ? gx - depth : gx), Z(-half), depth * scale, half * 2 * scale);
    box(BOX_DEPTH, BOX_HALF_WIDTH);
    box(5.5, GOAL_HALF_WIDTH + 5.5);
    const spot = gx - end * 11;
    g.fillStyle = 'white';
    g.beginPath();
    g.arc(X(spot), Z(0), 0.22 * scale, 0, Math.PI * 2);
    g.fill();
    // The arc outside the box.
    const a = Math.acos((BOX_DEPTH - 11) / CIRCLE_RADIUS);
    g.beginPath();
    if (end > 0) g.arc(X(spot), Z(0), CIRCLE_RADIUS * scale, Math.PI - a, Math.PI + a);
    else g.arc(X(spot), Z(0), CIRCLE_RADIUS * scale, -a, a);
    g.stroke();
    // Corner arcs.
    [-1, 1].forEach((side) => {
      g.beginPath();
      const cz = side * HALF_WIDTH;
      const starts = end > 0 ? [Math.PI / 2, Math.PI] : [0, -Math.PI / 2];
      const start = starts[side > 0 ? 1 : 0];
      g.arc(X(gx), Z(cz), 1 * scale, start, start + Math.PI / 2);
      g.stroke();
    });
  });
  g.beginPath();
  g.arc(X(0), Z(0), 0.22 * scale, 0, Math.PI * 2);
  g.fillStyle = 'white';
  g.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
};

// Seats full of people: random coloured dots on a dark stand.
const crowdTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#25262c';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const colors = [
    '#d9d4cc',
    '#c8102e',
    '#1d2b5b',
    '#f2c94c',
    '#2f7a35',
    '#111',
    '#7a5a45',
    '#e8e8e8',
  ];
  for (let row = 0; row < 32; row += 1) {
    for (let k = 0; k < 128; k += 1) {
      // A few empty seats.
      if (Math.random() > 0.12) {
        g.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        g.fillRect(k * 8 + Math.random() * 2, row * 8 + Math.random() * 2, 5, 6);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
};

const goal = (end: number): THREE.Group => {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 });
  const post = new THREE.CylinderGeometry(0.06, 0.06, GOAL_HEIGHT, 12);
  [-1, 1].forEach((s) => {
    const m = new THREE.Mesh(post, white);
    m.position.set(0, GOAL_HEIGHT / 2, s * GOAL_HALF_WIDTH);
    m.castShadow = true;
    group.add(m);
  });
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, GOAL_HALF_WIDTH * 2 + 0.12, 12),
    white
  );
  bar.rotation.x = Math.PI / 2;
  bar.position.y = GOAL_HEIGHT;
  bar.castShadow = true;
  group.add(bar);

  // The net: a box of thin lines behind the goal.
  const net = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.35,
    wireframe: true,
    side: THREE.DoubleSide,
  });
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(GOAL_HALF_WIDTH * 2, GOAL_HEIGHT, 24, 10),
    net
  );
  back.rotation.y = Math.PI / 2;
  back.position.set(end * GOAL_DEPTH, GOAL_HEIGHT / 2, 0);
  group.add(back);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HALF_WIDTH * 2, 8, 24), net);
  top.rotation.x = Math.PI / 2;
  top.position.set((end * GOAL_DEPTH) / 2, GOAL_HEIGHT, 0);
  group.add(top);
  [-1, 1].forEach((s) => {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, 8, 10), net);
    side.position.set((end * GOAL_DEPTH) / 2, GOAL_HEIGHT / 2, s * GOAL_HALF_WIDTH);
    group.add(side);
  });
  group.position.x = end * HALF_LENGTH;
  return group;
};

export const buildStadium = (scene: THREE.Scene, renderer: THREE.WebGLRenderer): void => {
  const w = (HALF_LENGTH + APRON) * 2;
  const h = (HALF_WIDTH + APRON) * 2;
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: pitchTexture(renderer), roughness: 0.95 })
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);

  scene.add(goal(1));
  scene.add(goal(-1));

  // Four stands, rising away from the pitch: each a sloped quad from its front edge.
  const crowd = crowdTexture();
  const stand = (a: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3) => {
    const depth = 26;
    const rise = 15;
    const back = out.clone().multiplyScalar(depth).setY(rise);
    const c = b.clone().add(back);
    const d = a.clone().add(back);
    const repeat = a.distanceTo(b) / 30;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [a, b, c, d].flatMap((v) => v.toArray()),
        3
      )
    );
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, repeat, 0, repeat, 1, 0, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    const t = crowd.clone();
    t.repeat.set(1, 1);
    t.needsUpdate = true;
    scene.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ map: t, roughness: 1, side: THREE.DoubleSide })
      )
    );
    // The advertising wall in front of it.
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(a.distanceTo(b), 1.1),
      new THREE.MeshStandardMaterial({ color: '#1d3557', roughness: 0.6, side: THREE.DoubleSide })
    );
    wall.position.copy(a.clone().add(b).multiplyScalar(0.5)).setY(0.55);
    wall.lookAt(wall.position.clone().sub(out));
    scene.add(wall);
  };
  const gz = HALF_WIDTH + APRON;
  const gx = HALF_LENGTH + APRON;
  const v = (x: number, z: number) => new THREE.Vector3(x, 1.1, z);
  stand(v(-gx, -gz), v(gx, -gz), new THREE.Vector3(0, 0, -1));
  stand(v(-gx, gz), v(gx, gz), new THREE.Vector3(0, 0, 1));
  stand(v(-gx, -gz), v(-gx, gz), new THREE.Vector3(-1, 0, 0));
  stand(v(gx, -gz), v(gx, gz), new THREE.Vector3(1, 0, 0));

  // The two dugouts past the far touchline, where the substitutes sit (engine/scenes.ts seats
  // them along BENCH_Z, facing the pitch): a seat, a back wall and a see-through roof, so the TV
  // camera still sees who is on the bench.
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2f38', roughness: 0.8 });
  const seatMat = new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#cfe8ff',
    transparent: true,
    opacity: 0.22,
    roughness: 0.1,
    side: THREE.DoubleSide,
  });
  [-1, 1].forEach((dir) => {
    const length = (BENCH.length - 1) * SEAT_GAP + 1.2;
    const cx = dir * (BENCH_X + ((BENCH.length - 1) * SEAT_GAP) / 2);
    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number
    ) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    add(new THREE.BoxGeometry(length, 0.44, 0.5), seatMat, cx, 0.22, BENCH_Z - 0.12);
    add(new THREE.BoxGeometry(length + 0.3, 1.9, 0.12), dark, cx, 0.95, BENCH_Z - 0.55);
    [-1, 1].forEach((end) =>
      add(
        new THREE.BoxGeometry(0.08, 1.9, 1.3),
        glass,
        cx + (end * (length + 0.3)) / 2,
        0.95,
        BENCH_Z + 0.08
      )
    );
    const roof = add(
      new THREE.BoxGeometry(length + 0.3, 0.05, 1.5),
      glass,
      cx,
      1.95,
      BENCH_Z + 0.15
    );
    roof.castShadow = false;
  });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: '#1b1c21', roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);
};
