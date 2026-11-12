// The ground of the arena: gentle hills. The engine stands the hero and the shots on it and the
// renderer draws the same surface, so what you see is where you are.
export const heightAt = (x: number, z: number): number =>
  Math.sin(x * 0.07) * Math.cos(z * 0.06) * 0.9 + Math.sin((x + z) * 0.03) * 0.6;
