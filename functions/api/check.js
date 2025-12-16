export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    // 1. Проверка: установлен ли ключ API в настройках Cloudflare
    if (!env.GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ 
        result: "ОШИБКА НАСТРОЕК: Не найден GOOGLE_API_KEY. Проверьте Settings -> Environment variables в Cloudflare." 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Формируем запрос к нейросети
    const prompt = `
      Ты опытный эксперт.
      КЕЙС: ${body.case_text}
      
      РЕШЕНИЕ СТУДЕНТА: ${body.solution}
      
      ЗАДАНИЕ:
      Оцени решение студента. Будь объективен.
      1. Поставь оценку (из 10).
      2. Выдели сильные стороны.
      3. Укажи на ошибки или риски.
      4. Дай совет по улучшению.
      Используй HTML теги (<b>, <br>) для форматирования.
    `;

    // === ИСПРАВЛЕНИЕ: Используем точную версию модели (gemini-1.5-flash-001) ===
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${env.GOOGLE_API_KEY}`;

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

    // 3. Обработка ошибок от самого Google
    if (googleData.error) {
       return new Response(JSON.stringify({ 
         result: "ОШИБКА API GOOGLE: " + googleData.error.message 
       }), {
         headers: { "Content-Type": "application/json" }
       });
    }

    // 4. Достаем текст ответа
    const aiText = googleData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
       return new Response(JSON.stringify({ 
         result: "ПУСТОЙ ОТВЕТ. Google вернул непонятные данные: " + JSON.stringify(googleData) 
       }), {
         headers: { "Content-Type": "application/json" }
       });
    }

    // 5. Успех! Возвращаем ответ на сайт
    return new Response(JSON.stringify({ result: aiText }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    // Ловим любые технические ошибки (в коде)
    return new Response(JSON.stringify({ result: "КРИТИЧЕСКАЯ ОШИБКА: " + err.message }), { status: 200 });
  }
}
