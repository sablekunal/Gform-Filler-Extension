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
    const systemPrompt = `Role: Expert AI Engine (Llama-3-70b).
Task: Fill Google Forms with 100% accuracy and ZERO skips.

INSTRUCTIONS:
1. ALWAYS provide an answer. If detail is missing from context (e.g. opinion on AI), logically GUESS a professional response. 
2. ONLY skip (skip: true) if a question explicitly excludes the user (e.g. 'Only for Female' and user is Male).
3. FORMATS: Time='HH:MM', Date='DD-MM-YYYY', Duration='HH:MM:SS'.
4. SELECTION: For MCQs/Dropdowns/Grids, you MUST provide indices. "text" must be empty.
5. TEXT: For text fields, leave "indices" as [].

Schema:
{
  "indices": [ints],
  "text": "string",
  "reasoning": "str", 
  "skip": boolean
}`;

    const parsedQuestion = JSON.parse(question);
    const userPrompt = `USER_PROFILE_CONTEXT:
${context}

TARGET_QUESTION:
- Text: ${parsedQuestion.question}
- Type: ${parsedQuestion.type}
- Options: ${JSON.stringify(parsedQuestion.options)}`;

    let attempts = 0;
    while (attempts < 2) {
        try {
            const response = await fetch("https://llamaproxy.actofjoy00.workers.dev/v1/chat/completions", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": "Bearer sk-cf-proxy-key"
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    stream: false
                })
            });

            if (!response.ok) {
                const err = await response.text();
                console.error(`Worker API Error (${response.status}):`, err);
                attempts++;
                continue;
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                let reply = data.choices[0].message.content.trim();
                reply = reply.replace(/```json/gi, "").replace(/```/g, "").replace(/\*\*/g, "").trim();

                const jsonMatch = reply.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        return { answer: parsed };
                    } catch (e) { }
                }

                if (reply.toLowerCase() === 'null') return { answer: { skip: true, reasoning: "AI returned null" } };

                reply = reply.replace(/^"|"$/g, '').trim();
                return { answer: { text: reply, indices: [], skip: false, reasoning: "Fallback matching" } };
            }
        } catch (error) {
            console.error(`AI API Error (Attempt ${attempts + 1}):`, error);
        }
        attempts++;
        if (attempts < 2) await new Promise(res => setTimeout(res, 1000)); 
    }
    return { answer: { skip: true, reasoning: "Cloudflare Worker Timeout/Failure" } };
}
