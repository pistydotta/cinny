// Math that gives the same bits on every device. JavaScript only promises exact results for
// + - * / and Math.sqrt; Math.sin, cos, atan2, exp, log and pow may differ in the last digit
// between browsers and Node, and over ten minutes of a run one digit is enough to change a
// result. The server replays runs to check them, so the engine uses only these.
// Each is a series that needs nothing but the exact operations.

const PI = 3.141592653589793;
const HALF_PI = PI / 2;
const TWO_PI = PI * 2;
const LN2 = 0.6931471805599453;

export const dsqrt = Math.sqrt;

export const sq = (x: number): number => x * x;

export const dhypot = (x: number, y: number): number => Math.sqrt(x * x + y * y);

// sin on [-pi/2, pi/2] by its Taylor series (error under 1e-14).
const sinNear = (x: number): number => {
  const x2 = x * x;
  let term = x;
  let sum = x;
  for (let n = 1; n <= 9; n += 1) {
    term *= -x2 / (2 * n * (2 * n + 1));
    sum += term;
  }
  return sum;
};

export const dsin = (x: number): number => {
  // Into [-pi, pi], then folded into [-pi/2, pi/2].
  let r = x - Math.round(x / TWO_PI) * TWO_PI;
  if (r > HALF_PI) r = PI - r;
  else if (r < -HALF_PI) r = -PI - r;
  return sinNear(r);
};

export const dcos = (x: number): number => dsin(x + HALF_PI);

// atan on [0, tan(pi/8)] by its series.
const atanNear = (z: number): number => {
  const z2 = z * z;
  let power = z;
  let sum = z;
  for (let n = 1; n <= 16; n += 1) {
    power *= -z2;
    sum += power / (2 * n + 1);
  }
  return sum;
};

const TAN_PI_8 = 0.41421356237309503;

const datan = (z: number): number => {
  if (z < 0) return -datan(-z);
  if (z > 1) return HALF_PI - datan(1 / z);
  if (z > TAN_PI_8) return PI / 4 + atanNear((z - 1) / (z + 1));
  return atanNear(z);
};

export const datan2 = (y: number, x: number): number => {
  if (x > 0) return datan(y / x);
  if (x < 0) return y >= 0 ? datan(y / x) + PI : datan(y / x) - PI;
  if (y > 0) return HALF_PI;
  if (y < 0) return -HALF_PI;
  return 0;
};

// ln for x > 0: x = m * 2^e with m in [1, 2), and ln(m) = 2 atanh((m - 1) / (m + 1)).
const dlog = (x: number): number => {
  let m = x;
  let e = 0;
  while (m >= 2) {
    m /= 2;
    e += 1;
  }
  while (m < 1) {
    m *= 2;
    e -= 1;
  }
  const u = (m - 1) / (m + 1);
  const u2 = u * u;
  let power = u;
  let sum = u;
  for (let n = 1; n <= 20; n += 1) {
    power *= u2;
    sum += power / (2 * n + 1);
  }
  return 2 * sum + e * LN2;
};

// e^x = 2^k * e^r with r small.
const dexp = (x: number): number => {
  const k = Math.round(x / LN2);
  const r = x - k * LN2;
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 20; n += 1) {
    term *= r / n;
    sum += term;
  }
  let scale = 1;
  for (let i = 0; i < Math.abs(k); i += 1) scale *= 2;
  return k >= 0 ? sum * scale : sum / scale;
};

// base ** exponent for base >= 0.
export const dpow = (base: number, exponent: number): number => {
  if (base === 0) return exponent === 0 ? 1 : 0;
  return dexp(exponent * dlog(base));
};
