/* Заставка канала и финальная плашка (как в ролике про АЭС). Грузится последним. */
(function () {
  const { R, C } = E, { INTRO, OUTRO, END } = G;
  const brand = (sc, top) => {
    sc.d(R.circ(960, 400, 520, { c: C.blue, w: 8, r: 1.6 }), 0.1, 0.9);
    sc.img('assets/logo.png', 0.15, 960, 400, 470);
    sc.txt('Pushckin AI mult', 0.9, 1.1, 960, 780, 130, C.ink, { anchor: 'middle' });
    sc.txt('@Pushckin_Ai', 2.0, 0.7, 960, 880, 60, C.blue, { anchor: 'middle' });
    if (top) sc.txt(top, 1.0, 1.4, 960, 1010, 54, C.red, { anchor: 'middle', rot: -2 });
    sc.sfx('logo', 0.1);
  };
  brand(E.scene(-INTRO, 0, 'fade'), null);
  brand(E.scene(END, END + OUTRO, 'fade'), 'Подписывайся и жди новые мультики!');
  window.TOTAL_DUR = INTRO + END + OUTRO; window.INTRO = INTRO;
})();
