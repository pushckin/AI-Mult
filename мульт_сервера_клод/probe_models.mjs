// Проверка доступных моделей TTS/Lyria. Запуск: node probe_models.mjs
const key = process.env.GEMINI_API_KEY;
for (const ver of ['v1beta', 'v1']) {
  let token = '';
  const names = [];
  do {
    const r = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?pageSize=1000${token ? '&pageToken=' + token : ''}`, { headers: { 'x-goog-api-key': key } });
    const j = await r.json();
    if (!r.ok) { console.log(ver, r.status, JSON.stringify(j).slice(0, 200)); break; }
    for (const m of j.models || []) names.push(m.name);
    token = j.nextPageToken || '';
  } while (token);
  console.log(ver, names.length, names.filter((n) => /tts|lyria|audio|music/i.test(n)).join(', '));
}
