const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const fastDelay = () => delay(Math.floor(Math.random() * (150 - 50 + 1)) + 50); // Optimized for speed

let isUltraRunning = false;

// Helper: Match text to selection indices
function findBestIndex(text, options) {
    if (!text || !options.length) return [];
    const lowerText = text.toLowerCase();
    const exactIdx = options.findIndex(opt => opt.toLowerCase() === lowerText);
    if (exactIdx !== -1) return [exactIdx];
    const fuzzyIdx = options.findIndex(opt => lowerText.includes(opt.toLowerCase()) || opt.toLowerCase().includes(lowerText));
    if (fuzzyIdx !== -1) return [fuzzyIdx];
    const matches = [];
    options.forEach((opt, idx) => { if (lowerText.includes(opt.toLowerCase())) matches.push(idx); });
    return matches;
}

// Global UI management
function initAuditTrailUI() {
    if (document.getElementById('gform-audit-trail')) return;
    const panel = document.createElement('div');
    panel.id = 'gform-audit-trail';
    Object.assign(panel.style, {
        position: 'fixed', top: '20px', right: '20px', width: '320px', maxHeight: '80vh',
        backgroundColor: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        borderRadius: '12px', zIndex: '10001', padding: '16px', display: 'flex',
        flexDirection: 'column', fontFamily: 'Segoe UI, Roboto, sans-serif', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.05)'
    });
    panel.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0; font-size:16px; color:#1a73e8;">🔍 Audit Trail Ultra</h3>
        <button id="close-audit" style="background:none; border:none; cursor:pointer; font-size:24px; line-height:1;">&times;</button>
    </div><div id="audit-list" style="overflow-y:auto; flex-grow:1; display:flex; flex-direction:column; gap:8px;"></div>`;
    document.body.appendChild(panel);
    document.getElementById('close-audit').onclick = () => panel.remove();
}

function updateAuditTrail(question, answer, status, reasoning = "") {
    initAuditTrailUI();
    const list = document.getElementById('audit-list');
    const entry = document.createElement('div');
    Object.assign(entry.style, {
        padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '4px',
        backgroundColor: status === 'Synced' ? '#e6f4ea' : (status === 'Skipped' ? '#f1f3f4' : '#fce8e6'),
        border: `1px solid ${status === 'Synced' ? '#ceead6' : (status === 'Skipped' ? '#dadce0' : '#fad2cf')}`
    });
    entry.innerHTML = `<div style="font-weight:bold; margin-bottom:4px; color:#202124;">${question.substring(0, 80)}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="color:#5f6368;">${answer || 'N/A'}</span>
            <span style="color:${status === 'Synced' ? '#188038' : (status === 'Skipped' ? '#5f6368' : '#d93025')}; font-weight:600;">${status}</span>
        </div>
        ${reasoning ? `<div style="font-style:italic; font-size:11px; color:#5f6368; border-top:1px solid rgba(0,0,0,0.05); padding-top:4px;">AI: ${reasoning}</div>` : ''}`;
    list.prepend(entry);
}

// "Perfect" Fill Logic - Speed Optimized
async function triggerPerfectFill(el, text = null) {
    if (!el) return;
    const events = ['mousedown', 'mouseup', 'click'];
    
    if (text === null && el.getAttribute('aria-checked') === 'true') return;

    for (const type of events) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, view: window }));
        // Reduced from 50ms to 10ms for ultra speed
        await delay(10);
    }
    if (text !== null) {
        el.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(10);
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    el.blur();
}

function waitForDropdown() {
    return new Promise(res => {
        let attempts = 0;
        const check = () => {
            const container = document.querySelector('.OA0qdb');
            const opts = container ? Array.from(container.querySelectorAll('div[role="option"]')) : [];
            if (opts.length > 0) return res(opts);
            if (++attempts > 10) return res([]); // Reduced from 20 to 10 attempts
            setTimeout(check, 100);
        };
        check();
    });
}

// CORE EXECUTION
async function fillForm(context) {
    if (isUltraRunning) return;
    isUltraRunning = true;
    
    initAuditTrailUI();
    let containers = Array.from(document.querySelectorAll('.geS5ne'));
    if (!containers.length) containers = Array.from(document.querySelectorAll('.geS5n'));
    if (!containers.length) containers = Array.from(document.querySelectorAll('div[role="listitem"]'));
    
    try {
        for (const qNode of containers) {
            if (qNode.dataset.ultraDone) continue;
            qNode.dataset.ultraDone = "true";

            const titleEl = qNode.querySelector('[role="heading"], .M7eMe');
            if (!titleEl) continue;
            const questionText = titleEl.innerText.trim();

            const gridRows = Array.from(qNode.querySelectorAll('[role="row"]')).filter(r => r.querySelector('[role="rowheader"]'));
            const optionsNodes = Array.from(qNode.querySelectorAll('[role="radio"], [role="checkbox"]'));
            const listBox = qNode.querySelector('[role="listbox"]');
            const mainInputs = Array.from(qNode.querySelectorAll('input:not([type="hidden"]), textarea'));

            // 1. Grid
            if (gridRows.length > 0) {
                for (const row of gridRows) {
                    const rowTitle = row.querySelector('[role="rowheader"]')?.innerText.trim() || "Row";
                    const rowInputNodes = Array.from(row.querySelectorAll('[role="radio"], [role="checkbox"]'));
                    const labels = rowInputNodes.map(r => r.getAttribute('aria-label') || "Option");
                    const ai = await analyzeContext(`${questionText} - ${rowTitle}`, context, labels, "grid");
                    if (ai && !ai.skip) {
                        const idxs = ai.indices.length ? ai.indices : findBestIndex(ai.text, labels);
                        for (const i of idxs) if (rowInputNodes[i]) await triggerPerfectFill(rowInputNodes[i]);
                        updateAuditTrail(`${questionText} [${rowTitle}]`, ai.text || `Idx: ${idxs.join(',')}`, "Synced", ai.reasoning);
                    }
                }
                continue;
            }

            // 2. Type Detection
            let qType = "text";
            let optsList = [];
            let activeDropdownOpts = null;

            if (listBox) {
                qType = "dropdown";
                listBox.click();
                activeDropdownOpts = await waitForDropdown();
                optsList = activeDropdownOpts.map(o => o.innerText.trim());
            } else if (optionsNodes.length > 0) {
                qType = qNode.querySelector('[role="checkbox"]') ? "checkbox" : "radio";
                optsList = optionsNodes.map(o => o.innerText.trim() || o.getAttribute('aria-label') || "Option");
            } else if (qNode.innerText.match(/date/i)) qType = "date";
            else if (qNode.innerText.match(/time|duration/i)) qType = "time";

            const ai = await analyzeContext(questionText, context, optsList, qType);
            
            if (ai && !ai.skip) {
                try {
                    if (qType === "dropdown" && activeDropdownOpts) {
                        const idx = ai.indices.length ? ai.indices[0] : findBestIndex(ai.text, optsList)[0];
                        if (activeDropdownOpts[idx]) await triggerPerfectFill(activeDropdownOpts[idx]);
                        else document.body.click(); 
                    } else if (optionsNodes.length > 0) {
                        const idxs = ai.indices.length ? ai.indices : findBestIndex(ai.text, optsList);
                        for (const i of idxs) if (optionsNodes[i]) await triggerPerfectFill(optionsNodes[i]);
                    } else if (mainInputs.length > 0) {
                        if (mainInputs.length > 1 && ai.text.includes(':')) {
                            const p = ai.text.split(':');
                            for (let i = 0; i < Math.min(p.length, mainInputs.length); i++) await triggerPerfectFill(mainInputs[i], p[i].trim());
                        } else if (mainInputs.length >= 3 && ai.text.includes('-')) {
                            const s = ai.text.split('-');
                            await triggerPerfectFill(mainInputs[0], s[1]); await triggerPerfectFill(mainInputs[1], s[2]); await triggerPerfectFill(mainInputs[2], s[0]);
                        } else {
                            await triggerPerfectFill(mainInputs[0], ai.text);
                        }
                    }
                    updateAuditTrail(questionText, ai.text || "Selection", "Synced", ai.reasoning);
                } catch (e) { if (listBox) document.body.click(); }
            } else {
                updateAuditTrail(questionText, "N/A", "Skipped", ai?.reasoning);
                if (listBox) document.body.click();
            }
            // Reduced bot delay for speed
            await fastDelay();
        }
    } finally {
        isUltraRunning = false;
    }
}

async function analyzeContext(question, context, options, qType) {
    return new Promise(rs => {
        chrome.runtime.sendMessage({ action: "fetch_ai_answer", question: JSON.stringify({ question, type: qType, options }), context: context }, (res) => rs(res?.answer || null));
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "fill_form") { fillForm(msg.context); sendResponse({ status: "Fast mode active" }); }
});
