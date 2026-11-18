import type React from "react";
export interface SceneDef {
  id: string;
  /** время начала/конца сцены в секундах (от начала части) */
  from: number;
  to: number;
  /** 3D-содержимое (внутри ThreeCanvas). t — время от начала ЧАСТИ. */
  render3d: (t: number) => React.ReactNode;
  /** 2D-оверлей поверх 3D (необязательно) */
  overlay?: (t: number, censored: boolean) => React.ReactNode;
  /** скрыть субтитры в момент t */
  hideSubs?: (t: number) => boolean;
  /** цвет фона WebGL */
  bg?: string;
}
