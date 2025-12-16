export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    // Проверяем ключ
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ 
        result: "ОШИБКА: Не найден GROQ_API_KEY в настройках Cloudflare." 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const prompt = `
      Ты профессиональный бизнес-трекер и преподаватель.
      
      КЕЙС:
      ${body.case_text}
      
      ОТВЕТ СТУДЕНТА:
      ${body.solution}
      
      ЗАДАНИЕ:
      Проверь решение. Дай оценку (1-10), выдели плюсы и укажи на ошибки.
      Используй HTML теги (<b>, <br>) для форматирования. Отвечай на русском языке.
    `;

    // Запрос к Groq с НОВОЙ моделью
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        // === ИЗМЕНЕНИЕ: Актуальная модель на 2025 год ===
        model: "llama-3.3-70b-versatile", 
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    // Обработка ошибок
    if (data.error) {
       return new Response(JSON.stringify({ 
         result: "ОШИБКА GROQ: " + data.error.message 
       }), {
         headers: { "Content-Type": "application/json" }
       });
    }

    const aiText = data.choices?.[0]?.message?.content;

    if (!aiText) {
       return new Response(JSON.stringify({ result: "Пустой ответ от Groq." }), {
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
