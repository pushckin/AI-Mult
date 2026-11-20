import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";

export interface AudioCue {
  /** Имя без расширения в public/audio/ (пробуются .wav .mp3 .ogg .m4a) */
  base: string;
  /** Кадр старта и (опц.) кадр окончания - жёсткая отсечка, нужна для «резкой тишины» */
  from: number;
  to?: number;
  volume?: number;
  loop?: boolean;
  note?: string;
}
/** base -> относительный путь в public/ или null, если файла нет. */
export type AudioAvail = Record<string, string | null>;

const EXTS = ["wav", "mp3", "ogg", "m4a"];

/** Проверка существования (в Studio несуществующий файл отдаётся как text/html - отсекаем). */
export const probeAudio = async (cues: AudioCue[]): Promise<AudioAvail> => {
  const out: AudioAvail = {};
  await Promise.all(
    Array.from(new Set(cues.map((c) => c.base))).map(async (base) => {
      out[base] = null;
      for (const ext of EXTS) {
        const rel = `audio/${base}.${ext}`;
        try {
          const res = await fetch(staticFile(rel));
          const ct = res.headers.get("content-type") || "";
          void res.body?.cancel();
          if (res.ok && !ct.includes("text/html")) {
            out[base] = rel;
            return;
          }
        } catch {
          /* нет файла */
        }
      }
    }),
  );
  return out;
};

export const AudioLayers: React.FC<{ cues: AudioCue[]; avail: AudioAvail; total: number }> = ({ cues, avail, total }) => (
  <>
    {cues.map((c, i) => {
      const rel = avail[c.base];
      if (!rel) return null;
      const dur = (c.to ?? total) - c.from;
      return (
        <Sequence key={`${c.base}-${i}`} from={c.from} durationInFrames={dur} layout="none">
          <Audio src={staticFile(rel)} volume={c.volume ?? 1} loop={c.loop} />
        </Sequence>
      );
    })}
  </>
);
