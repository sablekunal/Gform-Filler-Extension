const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomBotDelay = () => delay(Math.floor(Math.random() * (500 - 200 + 1)) + 200);

// Audit Trail data
const auditTrail = [];

// Human-Speed Execution Engine: The "Perfect" Fill
async function triggerPerfectFill(el, text = null) {
    const events = ['mousedown', 'mouseup', 'click'];
    
    // 1-3. Mouse events chain (mousedown -> mouseup -> click)
    for (const type of events) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        await delay(30); 
    }

    if (text !== null) {
        // 4. Input injection via execCommand (Bypasses React guards)
        el.focus();
        document.execCommand('insertText', false, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(50);
        
        // 5. Change event
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 6. Blur event (Triggers Google's viewer_base save)
    el.blur();
    
    // Draft Response Sync wait (as seen in Google Form network logs)
    await delay(150); 
}

// Precise UI Observer for .OA0qdb (Dropdown options container)
function waitForDropdown() {
    return new Promise((resolve) => {
        const check = () => {
            const container = document.querySelector('.OA0qdb');
            if (container) {
                const opts = Array.from(container.querySelectorAll('div[role="option"]'));
                if (opts.length > 0) return resolve(opts);
            }
            setTimeout(check, 50);
        };
        check();
        setTimeout(() => resolve([]), 1500); // UI timeout
    });
}

// Central safe click dispatcher (Ultra Edition)
function safeClick(element) {
    if (!element) return;
    const text = (element.innerText || '').toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();
    
    // Safety: Block submit clicks
    if (text.includes('submit') || type === 'submit') {
        console.warn("Ultra Core: Submit button interaction blocked.");
        return;
    }
    triggerPerfectFill(element);
}

function initAuditTrailUI() {
    if (document.getElementById('gform-audit-trail')) return;
    const panel = document.createElement('div');
    panel.id = 'gform-audit-trail';
    Object.assign(panel.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '320px',
        maxHeight: '80vh',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        borderRadius: '12px',
        zIndex: '10001',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Segoe UI, Roboto, sans-serif',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.05)'
    });

    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:16px; color:#1a73e8;">🔍 Audit Trail Ultra</h3>
            <button id="close-audit" style="background:none; border:none; cursor:pointer; font-size:24px; line-height:1;">&times;</button>
        </div>
        <div id="audit-list" style="overflow-y:auto; flex-grow:1; display:flex; flex-direction:column; gap:8px;"></div>
    `;
    document.body.appendChild(panel);
    document.getElementById('close-audit').onclick = () => panel.remove();
}

function updateAuditTrail(question, answer, status, reasoning = "") {
    initAuditTrailUI();
    const list = document.getElementById('audit-list');
    const entry = document.createElement('div');
    Object.assign(entry.style, {
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        backgroundColor: status === 'Synced' ? '#e6f4ea' : (status === 'Skipped' ? '#f1f3f4' : '#fce8e6'),
        border: `1px solid ${status === 'Synced' ? '#ceead6' : (status === 'Skipped' ? '#dadce0' : '#fad2cf')}`,
        marginBottom: '4px'
    });
    entry.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px; color:#202124;">${question.substring(0, 80)}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="color:#5f6368;">${answer || 'No Content'}</span>
            <span style="color:${status === 'Synced' ? '#188038' : (status === 'Skipped' ? '#5f6368' : '#d93025')}; font-weight:600;">${status}</span>
        </div>
        ${reasoning ? `<div style="font-style:italic; font-size:11px; color:#5f6368; border-top:1px solid rgba(0,0,0,0.05); padding-top:4px;">AI: ${reasoning}</div>` : ''}
    `;
    list.prepend(entry);
}

async function fillForm(context) {
    initAuditTrailUI();
    
    // Identify question containers
    let questions = Array.from(document.querySelectorAll('.geS5ne, .geS5n'));
    if (!questions.length) questions = Array.from(document.querySelectorAll('div[role="listitem"]'));
    
    if (!questions.length) {
        alert("Gform Filler Ultra: No question containers detected.");
        return;
    }

    for (const qNode of questions) {
        const titleEl = qNode.querySelector('[role="heading"], .M7eMe');
        if (!titleEl) continue;

        const questionText = titleEl.innerText.trim();
        const listBox = qNode.querySelector('[role="listbox"]');
        const gridRows = Array.from(qNode.querySelectorAll('[role="row"]')).filter(r => r.querySelector('[role="rowheader"]'));
        const optionsNodes = Array.from(qNode.querySelectorAll('[role="radio"], [role="checkbox"]'));
        
        // 1. Grid Logic (Complex detection)
        if (gridRows.length > 0) {
            for (const row of gridRows) {
                const rowHeader = row.querySelector('[role="rowheader"]');
                const rowTitle = rowHeader ? rowHeader.innerText.trim() : "Row";
                const rowInputs = Array.from(row.querySelectorAll('[role="radio"], [role="checkbox"]'));
                const rowOptions = rowInputs.map(ri => ri.getAttribute('aria-label') || ri.innerText.trim() || "Option");
                
                const rowAi = await analyzeContext(`${questionText} - ${rowTitle}`, context, rowOptions, "grid row");
                if (rowAi && !rowAi.skip) {
                    let rowSynced = false;
                    for (const idx of rowAi.indices) {
                        if (rowInputs[idx]) {
                            await triggerPerfectFill(rowInputs[idx]);
                            rowSynced = true;
                        }
                    }
                    updateAuditTrail(`${questionText} [${rowTitle}]`, rowAi.text || `Index ${rowAi.indices.join(',')}`, rowSynced ? "Synced" : "Failed", rowAi.reasoning);
                } else {
                    updateAuditTrail(`${questionText} [${rowTitle}]`, "N/A", "Skipped", rowAi?.reasoning || "No match");
                }
                await randomBotDelay();
            }
            continue; 
        }

        let qType = "text";
        let optionsList = [];

        // 2. Dropdown Logic
        if (listBox) {
            qType = "dropdown";
            safeClick(listBox);
            const opts = await waitForDropdown();
            optionsList = opts.map(o => o.innerText.trim());
            document.body.click(); // close the UI layer
            await delay(200);
        } else if (optionsNodes.length > 0) {
            const isMulti = qNode.querySelector('[role="checkbox"]') !== null;
            qType = isMulti ? "checkbox" : "radio";
            optionsList = optionsNodes.map(o => o.innerText.trim() || o.getAttribute('aria-label') || "Option");
        }

        const aiResponse = await analyzeContext(questionText, context, optionsList, qType);
        if (!aiResponse || aiResponse.skip) {
            updateAuditTrail(questionText, "N/A", "Skipped", aiResponse?.reasoning || "Logic constraint");
            continue;
        }

        let synced = false;
        try {
            if (qType === "dropdown" && listBox) {
                safeClick(listBox);
                const opts = await waitForDropdown();
                if (opts[aiResponse.indices[0]]) {
                    await triggerPerfectFill(opts[aiResponse.indices[0]]);
                    synced = true;
                }
            } else if ((qType === "radio" || qType === "checkbox") && optionsNodes.length > 0) {
                for (const idx of aiResponse.indices) {
                    if (optionsNodes[idx]) {
                        await triggerPerfectFill(optionsNodes[idx]);
                        synced = true;
                    }
                }
            } else {
                const input = qNode.querySelector('input, textarea');
                if (input) {
                    await triggerPerfectFill(input, aiResponse.text);
                    synced = true;
                }
            }
        } catch (e) { console.error("Ultra Fill Error:", e); }

        updateAuditTrail(questionText, aiResponse.text || `Idx: ${aiResponse.indices.join(',')}`, synced ? "Synced" : "Failed", aiResponse.reasoning);
        await randomBotDelay();
    }
}

async function analyzeContext(question, context, options, qType) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({
            action: "fetch_ai_answer",
            question: JSON.stringify({ question, type: qType, options }),
            context: context
        }, (res) => resolve(res?.answer || null));
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "fill_form") {
        fillForm(msg.context);
        sendResponse({ status: "Ultra mode initiated." });
    }
});
