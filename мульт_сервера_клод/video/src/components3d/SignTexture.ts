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

    const borderW = Math.max(4, Math.min(10, Math.round(Math.min(width, height) * 0.055)));
    const inset = borderW / 2 + 2;
    ctx.lineWidth = borderW;
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(inset, inset, Math.max(1, width - inset * 2), Math.max(1, height - inset * 2));

    const safeLines = lines.length > 0 ? lines : [""];
    const padX = borderW * 2 + 20;
    const padY = borderW * 2 + 14;
    const maxW = Math.max(16, width - padX);
    const maxH = Math.max(16, height - padY);
    const lineHeightRatio = 1.18;

    let fs = Math.max(10, fontSize);
    const totalHeightFactor = 1 + (safeLines.length - 1) * lineHeightRatio;
    if (fs * totalHeightFactor > maxH) {
      fs = Math.max(10, Math.floor(maxH / totalHeightFactor));
    }

    const fontStack = '"Arial Black", "Segoe UI", Arial, sans-serif';
    const measureMaxLine = (size: number): number => {
      ctx.font = `900 ${size}px ${fontStack}`;
      let maxMeasured = 0;
      for (const line of safeLines) {
        const w = ctx.measureText(line).width;
        if (w > maxMeasured) maxMeasured = w;
      }
      return maxMeasured;
    };

    const initialW = measureMaxLine(fs);
    if (initialW > maxW && initialW > 0) {
      fs = Math.max(10, Math.floor(fs * (maxW / initialW)));
    }
    while (fs > 10 && measureMaxLine(fs) > maxW) {
      fs -= 1;
    }

    ctx.fillStyle = fg;
    ctx.font = `900 ${fs}px ${fontStack}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (safeLines.length === 1) {
      ctx.fillText(safeLines[0], width / 2, height / 2 + 1);
    } else {
      const gap = fs * lineHeightRatio;
      const startY = height / 2 - ((safeLines.length - 1) * gap) / 2;
      safeLines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startY + idx * gap);
      });
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
