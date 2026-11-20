// Заглушки: цветные «вырезки» с контуром, рисуются в canvas.
// Размеры (w,h) и pivot для частей кукол - это одновременно РАСКЛАДКА (мировые px):
// настоящие PNG вписываются в эти боксы по высоте (см. PaperPuppet).
import * as THREE from "three";

export interface StubDef {
  w: number;
  h: number;
  pivot: [number, number]; // px от левого верхнего угла
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const INK = "#1b1b22";
const LW = 4;

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};
const box = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, r = 10) => {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke();
};
const ell = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, fill: string, stroke = true) => {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = LW;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
};
const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 16, color = "rgba(0,0,0,0.55)") => {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
};
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const SKIN = "#f4cfa4";
const BEIGE = "#d9c9a0";
const TROUSERS = "#4b5878";

const eyes = (ctx: CanvasRenderingContext2D, w: number, y: number, bored = true) => {
  ell(ctx, w / 2 - 24, y, 18, 20, "#fff");
  ell(ctx, w / 2 + 24, y, 18, 20, "#fff");
  ell(ctx, w / 2 - 20, y + (bored ? 6 : 0), 4, 4, INK, false);
  ell(ctx, w / 2 + 28, y + (bored ? 6 : 0), 4, 4, INK, false);
  if (bored) {
    // тяжёлые веки
    ctx.fillStyle = SKIN;
    ctx.fillRect(w / 2 - 44, y - 22, 40, 14);
    ctx.fillRect(w / 2 + 4, y - 22, 40, 14);
    ctx.fillStyle = INK;
    ctx.fillRect(w / 2 - 44, y - 9, 40, 3);
    ctx.fillRect(w / 2 + 4, y - 9, 40, 3);
  }
};

const mouthDraw = (kind: string) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  if (kind === "closed") {
    ctx.beginPath();
    ctx.moveTo(6, h / 2 + 2);
    ctx.quadraticCurveTo(w / 2, h / 2 - 6, w - 6, h / 2 + 4);
    ctx.stroke();
  } else if (kind === "a") {
    ell(ctx, w / 2, h / 2, 14, 10, "#5a1a22");
  } else if (kind === "o") {
    ell(ctx, w / 2, h / 2, 10, 13, "#5a1a22");
  } else {
    box(ctx, 4, 4, w - 8, h - 8, "#5a1a22", 8);
    ell(ctx, w / 2, h - 10, 12, 6, "#d65a6a", false);
  }
};

const figureParts = (ch: "greg" | "alien", out: Record<string, StubDef>) => {
  const g = ch === "greg";
  const skin = g ? SKIN : "#eab88e";
  const shirt = g ? BEIGE : skin; // пришелец голый: телесный силуэт
  const legW = 46;
  const legH = 120;
  for (const side of ["l", "r"]) {
    out[`${ch}_leg_${side}`] = {
      w: legW,
      h: legH,
      pivot: [legW / 2, 8],
      draw: (c, w, h) => {
        box(c, 3, 3, w - 6, h - 6, g ? TROUSERS : skin, 12);
        if (g) box(c, 0, h - 26, w, 24, "#2a2a30", 8);
        else box(c, 0, h - 26, w, 24, skin, 8);
      },
    };
  }
  out[`${ch}_torso`] = {
    w: 150,
    h: 190,
    pivot: [75, 182],
    draw: (c, w, h) => {
      box(c, 4, 4, w - 8, h - 8, shirt, 26);
      if (g) {
        // воротник, кривой галстук, нагрудный карман
        c.fillStyle = "#c9b98a";
        c.beginPath();
        c.moveTo(w / 2 - 30, 4);
        c.lineTo(w / 2, 40);
        c.lineTo(w / 2 + 30, 4);
        c.closePath();
        c.fill();
        c.stroke();
        c.save();
        c.translate(w / 2 + 6, 80);
        c.rotate(0.18);
        box(c, -9, -30, 18, 80, "#b3262d", 4);
        c.restore();
        box(c, 20, 100, 36, 30, "#cdbd92", 4);
      }
      label(c, "torso", w / 2, h - 16, 14);
    },
  };
  for (const side of ["l", "r"]) {
    out[`${ch}_arm_${side}`] = {
      w: 42,
      h: 124,
      pivot: [21, 14],
      draw: (c, w, h) => {
        box(c, 3, 3, w - 6, h - 6, skin, 14);
        if (g) {
          box(c, 0, 0, w, 52, BEIGE, 12); // короткий рукав
        }
        ell(c, w / 2, h - 16, 15, 15, skin);
      },
    };
  }
  out[`${ch}_head`] = {
    w: g ? 172 : 190,
    h: g ? 152 : 170,
    pivot: [g ? 86 : 95, g ? 142 : 160],
    draw: (c, w, h) => {
      if (g) {
        ell(c, w / 2, h / 2 + 4, w / 2 - 4, h / 2 - 6, skin);
        // лысина + остатки волос по бокам
        c.fillStyle = "#6a4a2c";
        c.beginPath();
        c.arc(14, h / 2 - 6, 14, 0, Math.PI * 2);
        c.arc(w - 14, h / 2 - 6, 14, 0, Math.PI * 2);
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = INK;
        c.beginPath();
        c.moveTo(w * 0.35, 18);
        c.quadraticCurveTo(w * 0.5, 4, w * 0.62, 20);
        c.stroke();
        eyes(c, w, 52);
        // шрам через щёку
        c.strokeStyle = "#a33a3a";
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(w * 0.62, 60);
        c.lineTo(w * 0.86, 100);
        c.stroke();
        // нос
        ell(c, w / 2 + 4, 82, 9, 10, "#eab98e");
      } else {
        // маска пришельца: большая зелёная голова, чёрные глаза
        ell(c, w / 2, h / 2, w / 2 - 4, h / 2 - 4, "#9fc98e");
        ell(c, w / 2 - 38, h / 2 - 6, 26, 36, "#0e0e14");
        ell(c, w / 2 + 38, h / 2 - 6, 26, 36, "#0e0e14");
        ell(c, w / 2 - 44, h / 2 - 20, 6, 8, "#fff", false);
        ell(c, w / 2 + 32, h / 2 - 20, 6, 8, "#fff", false);
      }
    },
  };
  for (const v of ["closed", "a", "o", "wide"]) {
    out[`${ch}_mouth_${v}`] = {
      w: 54,
      h: 36,
      pivot: [27, 18],
      draw: mouthDraw(v),
    };
  }
};

export const buildStubs = (): Record<string, StubDef> => {
  const out: Record<string, StubDef> = {};
  figureParts("greg", out);
  figureParts("alien", out);
  // накладка «тик»: веко, прикрывающее глаз
  out["greg_tick"] = {
    w: 52,
    h: 30,
    pivot: [26, 15],
    draw: (c, w, h) => {
      box(c, 2, 2, w - 4, h - 4, SKIN, 8);
      c.strokeStyle = INK;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(6, h / 2 + 4);
      c.lineTo(w - 6, h / 2 + 4);
      c.stroke();
    },
  };
  out["greg_cup"] = {
    w: 34,
    h: 48,
    pivot: [17, 26],
    draw: (c, w, h) => {
      c.beginPath();
      c.moveTo(2, 8);
      c.lineTo(w - 2, 8);
      c.lineTo(w - 7, h - 2);
      c.lineTo(7, h - 2);
      c.closePath();
      c.fillStyle = "#f5f1e6";
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = INK;
      c.stroke();
      box(c, 0, 0, w, 12, "#6b3a1c", 4);
      box(c, 6, 22, w - 12, 12, "#b3262d", 2);
    },
  };
  out["fx_tooth"] = {
    w: 16,
    h: 20,
    pivot: [8, 10],
    draw: (c, w, h) => box(c, 1, 1, w - 2, h - 2, "#fffbe8", 4),
  };
  out["fx_dust"] = {
    w: 240,
    h: 170,
    pivot: [120, 85],
    draw: (c, w, h) => {
      ell(c, w * 0.3, h * 0.55, 56, 46, "#8d8a96");
      ell(c, w * 0.55, h * 0.4, 66, 54, "#a7a4ae");
      ell(c, w * 0.72, h * 0.62, 48, 40, "#8d8a96");
    },
  };
  out["fx_boom"] = {
    w: 260,
    h: 260,
    pivot: [130, 130],
    draw: (c, w, h) => {
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? 70 : 124;
        c.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
      }
      c.closePath();
      c.fillStyle = "#ff9d1c";
      c.fill();
      c.lineWidth = LW;
      c.strokeStyle = INK;
      c.stroke();
      ell(c, w / 2, h / 2, 50, 50, "#ffe45c");
    },
  };
  out["rocket"] = {
    w: 120,
    h: 28,
    pivot: [60, 14],
    draw: (c, w, h) => {
      box(c, 14, 3, w - 30, h - 6, "#d8dbe0", 10);
      c.beginPath();
      c.moveTo(w - 16, 3);
      c.lineTo(w - 2, h / 2);
      c.lineTo(w - 16, h - 3);
      c.closePath();
      c.fillStyle = "#c0262d";
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(14, h / 2);
      c.lineTo(-8 + 14, 0);
      c.lineTo(-8 + 14, h);
      c.closePath();
      c.fillStyle = "#ff9d1c";
      c.fill();
    },
  };
  out["car"] = {
    w: 780,
    h: 230,
    pivot: [390, 215], // центр по X, низ колёс
    draw: (c, w, h) => {
      // кабриолет-суперкар: низкий хромированный корпус, открытая кабина
      box(c, 10, 90, w - 20, 100, "#c8d0d6", 40);
      c.beginPath();
      c.moveTo(w * 0.12, 94);
      c.quadraticCurveTo(w * 0.4, 50, w * 0.62, 70);
      c.lineTo(w * 0.9, 100);
      c.lineTo(w * 0.12, 100);
      c.closePath();
      c.fillStyle = "#e6ecef";
      c.fill();
      c.stroke();
      box(c, w * 0.34, 62, w * 0.26, 30, "#7fb8d6", 8); // лобовое
      box(c, w - 70, 118, 54, 18, "#ffe45c", 6); // фара
      box(c, 22, 112, 44, 16, "#c0262d", 6);
      for (const wx of [w * 0.22, w * 0.76]) {
        ell(c, wx, h - 40, 42, 42, "#1d1d24");
        ell(c, wx, h - 40, 22, 22, "#b8c0c8");
      }
      label(c, "SUPERCAR", w / 2, 150, 22);
    },
  };
  out["bike"] = {
    w: 440,
    h: 210,
    pivot: [220, 105],
    draw: (c, w, h) => {
      box(c, 70, 80, 300, 56, "#3a3f4a", 24);
      box(c, 120, 52, 120, 40, "#e04a3a", 14);
      box(c, 290, 60, 110, 20, "#555b68", 8); // пилоны с ракетами
      box(c, 10, 70, 90, 26, "#555b68", 8);
      ell(c, 116, 156, 50, 50, "#1d1d24");
      ell(c, 116, 156, 24, 24, "#8b93a0");
      ell(c, 330, 156, 50, 50, "#1d1d24");
      ell(c, 330, 156, 24, 24, "#8b93a0");
      box(c, 20, 40, 80, 14, "#ff9d1c", 6); // дюзы
      label(c, "OPPRESSOR Mk II", w / 2, 122, 18, "rgba(255,255,255,0.7)");
    },
  };
  return out;
};

// ---------- Фоны ----------
export interface StubBgDef {
  w: number;
  h: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const neon = ["#ff2e93", "#27e5ff", "#ffe134", "#8cff3d", "#ff7a1a"];

// Соглашения как у настоящих слоёв: высота 1080, центр слоя = центр кадра, база зданий y=770,
// тротуар y 770-930, асфальт 965-1080 (канва -> авторские y = 540 - y_канвы).
export const buildStubBgs = (): Record<string, StubBgDef> => ({
  bg_sky: {
    w: 2000,
    h: 1080,
    draw: (c, w, h) => {
      const bands = ["#0b0b26", "#12123a", "#1b1850", "#2a1d5e", "#3b2470"];
      const bh = h / bands.length;
      bands.forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect(0, i * bh, w, bh + 1);
      });
      const r = rng(7);
      c.fillStyle = "#e8e6ff";
      for (let i = 0; i < 90; i++) {
        const s = 2 + r() * 4;
        c.fillRect(r() * w, r() * h * 0.6, s, s);
      }
      ell(c, w * 0.7, h * 0.2, 70, 70, "#f4efc8");
    },
  },
  bg_far: {
    w: 2100,
    h: 1080,
    draw: (c, w) => {
      const r = rng(21);
      let x = 0;
      while (x < w) {
        const bw = 120 + r() * 160;
        const bhh = 260 + r() * 360;
        box(c, x, 770 - bhh, bw, bhh + 10, r() > 0.5 ? "#241c4a" : "#2c2058", 0);
        c.fillStyle = "#ffe9a0";
        for (let wy = 770 - bhh + 20; wy < 750; wy += 34) for (let wx = x + 14; wx < x + bw - 20; wx += 30) if (r() > 0.62) c.fillRect(wx, wy, 14, 18);
        x += bw + 6;
      }
    },
  },
  bg_mid: {
    w: 2300,
    h: 1080,
    draw: (c, w) => {
      const r = rng(5);
      let x = 0;
      while (x < w) {
        const bw = 240 + r() * 200;
        const bhh = 380 + r() * 220;
        box(c, x, 770 - bhh, bw, bhh + 10, ["#33285f", "#3d2d6b", "#2c2456", "#40306e"][Math.floor(r() * 4)], 0);
        c.fillStyle = "#ffd978";
        for (let wy = 770 - bhh + 30; wy < 720; wy += 54) for (let wx = x + 20; wx < x + bw - 30; wx += 48) if (r() > 0.55) c.fillRect(wx, wy, 22, 28);
        box(c, x + 20, 640, Math.min(bw - 40, 150), 36, neon[Math.floor(r() * neon.length)], 6);
        x += bw + 6;
      }
    },
  },
  bg_fore: {
    w: 2500,
    h: 1080,
    draw: (c, w) => {
      c.fillStyle = "#6a6878";
      c.fillRect(0, 770, w, 160);
      c.fillStyle = "#58566a";
      for (let x = 0; x < w; x += 120) c.fillRect(x, 770, 4, 160);
      c.fillStyle = "#8a889a";
      c.fillRect(0, 930, w, 35);
      c.fillStyle = INK;
      c.fillRect(0, 770, w, 4);
      c.fillStyle = "#2a2a36";
      c.fillRect(0, 965, w, 115);
      c.fillStyle = "#e8c93a";
      for (let x = 0; x < w; x += 260) c.fillRect(x, 1030, 150, 10);
    },
  },
  billboard: {
    w: 1000,
    h: 640,
    draw: (c, w, h) => {
      box(c, 4, 4, w - 8, h - 8, "#15151c", 24);
      box(c, 52, 52, 896, 386, "#050507", 8);
      c.fillStyle = "#15151c";
      c.fillRect(w / 2 - 30, 450, 60, h - 450);
    },
  },
});

export const drawStubTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  const ctx = canvas.getContext("2d")!;
  ctx.lineJoin = "round";
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};
