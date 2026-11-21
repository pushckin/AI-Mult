// Разбор PCM-wav в браузере: длительность и огибающая громкости по кадрам (для рта: непрерывное раскрытие по амплитуде).
export interface VoiceInfo {
  dur: number; // секунды
  env: number[]; // 0..1 на каждый кадр
}

export const probeWav = async (url: string, fps: number): Promise<VoiceInfo | null> => {
  try {
    const res = await fetch(url);
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || ct.includes("text/html")) return null;
    const buf = await res.arrayBuffer();
    const dv = new DataView(buf);
    if (dv.byteLength < 44 || dv.getUint32(0, false) !== 0x52494646) return null; // RIFF
    let pos = 12;
    let rate = 24000;
    let ch = 1;
    let bits = 16;
    let dataPos = -1;
    let dataLen = 0;
    while (pos + 8 <= dv.byteLength) {
      const id = dv.getUint32(pos, false);
      const size = dv.getUint32(pos + 4, true);
      if (id === 0x666d7420) {
        ch = dv.getUint16(pos + 10, true);
        rate = dv.getUint32(pos + 12, true);
        bits = dv.getUint16(pos + 22, true);
      } else if (id === 0x64617461) {
        dataPos = pos + 8;
        dataLen = Math.min(size, dv.byteLength - dataPos);
        break;
      }
      pos += 8 + size + (size % 2);
    }
    if (dataPos < 0 || bits !== 16) return null;
    const n = Math.floor(dataLen / 2 / ch);
    const dur = n / rate;
    const frames = Math.ceil(dur * fps);
    const rms: number[] = [];
    for (let f = 0; f < frames; f++) {
      // окно ~50 мс (3 кадра при 60 fps): сглаживание огибающей, чтобы рот открывался плавно, а не «щёлкал»
      const a = Math.floor(((f - 1) / fps) * rate);
      const b = Math.floor(((f + 2) / fps) * rate);
      let acc = 0;
      let cnt = 0;
      for (let i = Math.max(0, a); i < Math.min(n, b); i += 2) {
        const v = dv.getInt16(dataPos + i * ch * 2, true) / 32768;
        acc += v * v;
        cnt++;
      }
      rms.push(cnt ? Math.sqrt(acc / cnt) : 0);
    }
    const sorted = [...rms].sort((x, y) => x - y);
    const ref = Math.max(1e-4, sorted[Math.floor(sorted.length * 0.95)]);
    const env = rms.map((v) => Math.min(1, Math.round((v / ref) * 100) / 100));
    return { dur, env };
  } catch {
    return null;
  }
};
