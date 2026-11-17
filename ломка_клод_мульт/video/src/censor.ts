import { getInputProps } from "remotion";

/** Цензурный рендер: `--props='{"censored":true}'`. В Studio и обычном рендере мат не маскируется. */
const RX = /[а-яё]*(?:бля|хуй|хуе|хуя|хуё|пизд|ёб|еб(?:ал|ат|ан|ну)|сук[аиу]|долбо)[а-яё]*/gi;

export const isCensored = (): boolean => {
  try {
    return Boolean((getInputProps() as { censored?: boolean }).censored);
  } catch {
    return false;
  }
};

/** «блядь» → «б***ь» (длина строки сохраняется — анимация набора текста не меняется) */
export const maskProfanity = (s: string): string =>
  isCensored() ? s.replace(RX, (w) => w[0] + "*".repeat(Math.max(1, w.length - 2)) + w[w.length - 1]) : s;
