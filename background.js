chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_filling") {
        chrome.tabs.sendMessage(request.tabId, {
            action: "fill_form",
            context: request.context
        }, (response) => {
            sendResponse(response);
        });
        return true;
    }

    if (request.action === "fetch_ai_answer") {
        handleApiRequest(request.question, request.context).then(sendResponse);
        return true;
    }
});

async function handleApiRequest(question, context) {
    const systemPrompt = `You are an expert engineer. You will be provided with a user's profile and a Google Form question.
If the question is conditional (e.g., 'Only for VIT students') and the user's profile does not match, return {"indices": [], "text": "", "skip": true}.
For multi-select, provide ALL applicable indices.
Output your answer as a JSON object with this exact schema:
{
  "indices": [0, 2], // Array of integer indices of the correct options. Empty [] if none apply.
  "text": "Extracted text", // Exact string answer for text fields.
  "skip": false // true if the question should be skipped conditionally, false otherwise.
}
Do not include any other text, markdown, or explanations.`;

    const userPrompt = `CONTEXT:\n${context}\n\nQUESTION: ${question}`;

    let attempts = 0;
    while (attempts < 2) {
        try {
            const response = await fetch("http://localhost:5001/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3-70b",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    stream: false
                })
            });

            const data = await response.json();

            if (data.choices && data.choices.length > 0) {
                let reply = data.choices[0].message.content.trim();
                reply = reply.replace(/```json/gi, "").replace(/```/g, "").replace(/\*\*/g, "").trim();

                if (reply.includes("该ip请求") || reply.includes("aichatos")) {
                    console.warn("AI Proxy Rate Limited");
                    return { answer: null }; // Request strictly failed
                }

                const jsonMatch = reply.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        return { answer: parsed };
                    } catch (e) { }
                }

                if (reply.toLowerCase() === 'null') {
                    return { answer: { skip: true } };
                }

                reply = reply.replace(/^"|"$/g, '').trim();
                return { answer: { text: reply, indices: [], skip: false } };
            }
        } catch (error) {
            console.error(`AI API Error (Attempt ${attempts + 1}):`, error);
        }
        attempts++;
        if (attempts < 2) await new Promise(res => setTimeout(res, 1000));
    }
    return { answer: { skip: true } };
}
