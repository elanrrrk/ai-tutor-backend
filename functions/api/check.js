export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    // 1. Проверка API ключа
    if (!env.GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ 
        result: "ОШИБКА НАСТРОЕК: Не найден GOOGLE_API_KEY. Проверьте Cloudflare Settings." 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Промпт
    const prompt = `
      Ты опытный эксперт.
      КЕЙС: ${body.case_text}
      РЕШЕНИЕ СТУДЕНТА: ${body.solution}
      
      ЗАДАНИЕ:
      Оцени решение студента. Будь объективен.
      1. Поставь оценку (из 10).
      2. Выдели сильные стороны.
      3. Укажи на ошибки.
      4. Дай совет.
      Используй HTML теги (<b>, <br>) для форматирования.
    `;

    // === ИСПРАВЛЕНИЕ: Используем самую стандартную модель 'gemini-pro' ===
    // Она есть на всех аккаунтах и работает всегда.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GOOGLE_API_KEY}`;

    const googleResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const googleData = await googleResponse.json();

    // 3. Обработка ошибок Google
    if (googleData.error) {
       return new Response(JSON.stringify({ 
         result: "ОШИБКА API GOOGLE: " + googleData.error.message 
       }), {
         headers: { "Content-Type": "application/json" }
       });
    }

    // 4. Достаем ответ
    const aiText = googleData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
       return new Response(JSON.stringify({ 
         result: "ПУСТОЙ ОТВЕТ ОТ GOOGLE: " + JSON.stringify(googleData) 
       }), {
         headers: { "Content-Type": "application/json" }
       });
    }

    // 5. Успех
    return new Response(JSON.stringify({ result: aiText }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ result: "ОШИБКА КОДА: " + err.message }), { status: 200 });
  }
}
