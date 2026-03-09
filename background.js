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
Task: Provide high-accuracy answers for Google Form fields.

Rules:
1. ALWAYS answer the question if possible. Use the USER_CONTEXT as the primary source.
2. If USER_CONTEXT is missing a specific detail (like an opinion on AI), use your general expertise to provide a logical, professional response.
3. SKIP (skip: true) is EXCLUSIVELY for conditional conflicts (e.g., a question header says "MANDATORY ONLY FOR VIT STUDENTS" but the User Context says the user is from "MIT").
4. If there is NO conditional conflict, "skip" MUST be false.
5. Provide all applicable indices for checkboxes.
6. Return STRICT JSON.

Schema:
{
  "indices": [ints], // Indices of options
  "text": "string",  // Text for inputs/textareas
  "reasoning": "str", // Why you chose this
  "skip": boolean     // ONLY true for branch/logic mismatches.
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
