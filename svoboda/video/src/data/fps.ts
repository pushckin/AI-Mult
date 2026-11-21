// Общая частота кадров сцен 2-4 (одно место). Все тайминги в проекте заданы в СЕКУНДАХ, в кадры переводятся только через sec().
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** секунды -> кадры композиции */
export const sec = (s: number) => Math.round(s * FPS);
/** кадры композиции -> секунды */
export const secOf = (frames: number) => frames / FPS;
