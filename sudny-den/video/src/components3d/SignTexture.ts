import * as THREE from "three";

export function makeSignTexture(
  lines: string[],
  bg: string,
  fg: string,
  borderColor = "#111827",
  width = 512,
  height = 160,
  fontSize = 64
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 10;
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    ctx.fillStyle = fg;
    ctx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (lines.length === 1) {
      ctx.fillText(lines[0], width / 2, height / 2 + 2);
    } else {
      const gap = fontSize * 1.15;
      const startY = height / 2 - ((lines.length - 1) * gap) / 2;
      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startY + idx * gap);
      });
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
