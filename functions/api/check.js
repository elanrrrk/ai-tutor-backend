export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    // Проверка, установлен ли ключ
    if (!env.GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ result: "ОШИБКА: Не найден GOOGLE_API_KEY в настройках Cloudflare!" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const prompt = `
      КЕЙС: ${body.case_text}
      ОТВЕТ: ${body.solution}
      Задание: Оцени ответ студента, найди ошибки.
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`;

    const googleResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const googleData = await googleResponse.json();

    // === ЛОГИКА ОТЛАДКИ ===
    // Если Google вернул ошибку явно
    if (googleData.error) {
       return new Response(JSON.stringify({ 
         result: "ОШИБКА GOOGLE: " + googleData.error.message 
       }), {
         headers: { "Content-Type": "application/json" }
       });
    }

    // Если ответ пустой или странный
    const aiText = googleData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
       // Возвращаем "внутренности" ответа, чтобы понять, что пришло
       return new Response(JSON.stringify({ 
         result: "СТРАННЫЙ ОТВЕТ (скиньте это в чат): " + JSON.stringify(googleData) 
       }), {
         headers: { "Content-Type": "application/json" }
       });
    }

    return new Response(JSON.stringify({ result: aiText }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ result: "ОШИБКА КОДА: " + err.message }), { status: 200 });
  }
}
