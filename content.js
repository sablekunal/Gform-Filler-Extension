const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const fastDelay = () => delay(Math.floor(Math.random() * (150 - 50 + 1)) + 50);

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

// Global UI - Premium Audit Trail Ultra
function initAuditTrailUI() {
    if (document.getElementById('gform-audit-ultra')) return;
    if (!document.getElementById('ultra-fonts')) {
        const link = document.createElement('link');
        link.id = 'ultra-fonts'; link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Material+Symbols+Outlined:wght,FILL@200,0..1&display=swap';
        document.head.appendChild(link);
    }
    const panel = document.createElement('div');
    panel.id = 'gform-audit-ultra';
    Object.assign(panel.style, {
        position: 'fixed', top: '20px', right: '20px', width: '360px', height: 'calc(100vh - 40px)',
        backgroundColor: 'rgba(16, 27, 34, 0.95)', backdropFilter: 'blur(20px)', webkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)', borderRadius: '16px', zIndex: '2147483647',
        display: 'flex', flexDirection: 'column', fontFamily: '"Inter", sans-serif',
        border: '1px solid rgba(255, 255, 255, 0.1)', overflow: 'hidden', color: '#f1f5f9'
    });
    panel.innerHTML = `
        <header style="display:flex; justify-content:space-between; align-items:center; padding:20px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);">
            <div style="display:flex; align-items:center; gap:12px;">
                <span class="material-symbols-outlined" style="color:#0d9af2; font-size:24px;">search_check</span>
                <span style="font-weight:700; font-size:18px;">Audit Trail Ultra</span>
            </div>
            <button id="close-ultra" style="background:rgba(255,255,255,0.05); border:none; color:#94a3b8; cursor:pointer; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                <span class="material-symbols-outlined" style="font-size:20px;">close</span>
            </button>
        </header>
        <div id="ultra-list" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px;"></div>
        <footer style="padding:16px 20px; background:rgba(0,0,0,0.2); border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:8px; height:8px; background:#22c55e; border-radius:50%;"></div>
                <span style="font-size:10px; font-weight:700; color:#94a3b8;">LIVE AI SYNC</span>
            </div>
        </footer>
    `;
    document.body.appendChild(panel);
    document.getElementById('close-ultra').onclick = () => panel.remove();
}

function updateAuditTrail(question, answer, status, reasoning = "") {
    initAuditTrailUI();
    const list = document.getElementById('ultra-list');
    const row = document.createElement('div');
    const colors = {
        'Synced': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', icon: 'auto_awesome' },
        'Skipped': { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', icon: 'info' },
        'Failed': { bg: 'rgba(244, 63, 94, 0.1)', text: '#f43f5e', icon: 'warning' }
    };
    const theme = colors[status] || colors['Skipped'];
    Object.assign(row.style, {
        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px'
    });
    row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:start; gap:12px;">
            <h3 style="margin:0; font-size:13px; font-weight:600; color:#f1f5f9; flex:1;">${question}</h3>
            <span style="background:${theme.bg}; color:${theme.text}; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:800;">${status}</span>
        </div>
        <div style="font-size:12px; color:#94a3b8;">"${answer || 'Empty'}"</div>
        ${reasoning ? `<div style="display:flex; align-items:center; gap:6px; color:#64748b; font-style:italic; font-size:11px;">
            <span class="material-symbols-outlined" style="font-size:14px;">${theme.icon}</span>
            <span>AI: ${reasoning}</span>
        </div>` : ''}
    `;
    list.prepend(row);
}

// HIGH PRECISION Fill Logic
async function triggerPerfectFill(el, text = null) {
    if (!el) return;
    const events = ['mousedown', 'mouseup', 'click'];
    
    // TIGHT LOCK: Check if already set by checking aria or value
    if (text === null && el.getAttribute('aria-checked') === 'true') return;

    for (const type of events) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, view: window }));
        await delay(20); 
    }
    if (text !== null) {
        el.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(30);
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    el.blur();
}

function waitForDropdown() {
    return new Promise(res => {
        let attempts = 0;
        const check = () => {
            const container = document.querySelector('.OA0qdb, [role="listbox"]:not([aria-expanded="false"])');
            const opts = container ? Array.from(document.querySelectorAll('.OA0qdb [role="option"], [role="listbox"] [role="option"]')) : [];
            if (opts.length > 0) return res(opts);
            if (++attempts > 20) return res([]);
            setTimeout(check, 100);
        };
        check();
    });
}

// MAIN EXECUTION
async function fillForm(context) {
    if (isUltraRunning) return;
    isUltraRunning = true;
    initAuditTrailUI();

    // PERMANENT FIX: Root Isolation
    // Only find the OUTERMOST containers to prevent the "Double Fill" children bug.
    let allCandidates = Array.from(document.querySelectorAll('.geS5ne, .geS5n, div[role="listitem"]'));
    let boxes = allCandidates.filter(candidate => {
        // If any OTHER candidate in the list is a parent of THIS candidate, then this one is a child.
        // We only want the parents.
        return !allCandidates.some(other => other !== candidate && other.contains(candidate));
    });

    try {
        for (const qNode of boxes) {
            // Check global processed flag
            if (qNode.dataset.ultraDone) continue;
            qNode.dataset.ultraDone = "true";

            const titleEl = qNode.querySelector('[role="heading"], .M7eMe');
            if (!titleEl) continue;
            const questionText = titleEl.innerText.trim();
            const gridRows = Array.from(qNode.querySelectorAll('[role="row"]')).filter(r => r.querySelector('[role="rowheader"]'));
            const optionsNodes = Array.from(qNode.querySelectorAll('[role="radio"], [role="checkbox"]'));
            const listBox = qNode.querySelector('[role="listbox"]');
            const mainInputs = Array.from(qNode.querySelectorAll('input:not([type="hidden"]), textarea'));

            // Process Grid
            if (gridRows.length > 0) {
                for (const row of gridRows) {
                    const rowTitle = row.querySelector('[role="rowheader"]')?.innerText.trim() || "Row";
                    const rowInputNodes = Array.from(row.querySelectorAll('[role="radio"], [role="checkbox"]'));
                    const labels = rowInputNodes.map(r => r.getAttribute('aria-label') || "Option");
                    const ai = await analyzeContext(`${questionText} - ${rowTitle}`, context, labels, "grid");
                    const idxs = ai?.indices.length ? ai.indices : findBestIndex(ai?.text, labels);
                    for (const i of idxs) if (rowInputNodes[i]) await triggerPerfectFill(rowInputNodes[i]);
                    updateAuditTrail(`${questionText} [${rowTitle}]`, ai?.text || `Idx: ${idxs.join(',')}`, "Synced", ai?.reasoning);
                }
                continue;
            }

            // Identify type
            let qType = "text";
            let optsList = [];
            let activeOpts = null;
            if (listBox) {
                qType = "dropdown";
                listBox.click();
                activeOpts = await waitForDropdown();
                optsList = activeOpts.map(o => o.innerText.trim());
                document.body.click(); // Close initial scan
                await delay(200);
            } else if (optionsNodes.length > 0) {
                qType = qNode.querySelector('[role="checkbox"]') ? "checkbox" : "radio";
                optsList = optionsNodes.map(o => o.innerText.trim() || o.getAttribute('aria-label') || "Option");
            } else if (qNode.innerText.match(/date/i)) qType = "date";
            else if (qNode.innerText.match(/time|duration/i)) qType = "time";

            const ai = await analyzeContext(questionText, context, optsList, qType);
            if (ai && !ai.skip) {
                try {
                    if (qType === "dropdown" && listBox) {
                        const idx = ai.indices.length ? ai.indices[0] : findBestIndex(ai.text, optsList)[0];
                        listBox.click(); // Open for REAL selection
                        const fresh = await waitForDropdown();
                        if (fresh[idx]) { await triggerPerfectFill(fresh[idx]); await delay(300); }
                        else document.body.click();
                    } else if (optionsNodes.length > 0) {
                        const idxs = ai.indices.length ? ai.indices : findBestIndex(ai.text, optsList);
                        for (const i of idxs) if (optionsNodes[i]) await triggerPerfectFill(optionsNodes[i]);
                    } else if (mainInputs.length > 0) {
                        // DATE DD-MM-YYYY
                        if (mainInputs.length >= 3 && ai.text.includes('-')) {
                            const [d, m, y] = ai.text.split('-');
                            if (qNode.innerText.toLowerCase().includes("dd-mm-yyyy")) {
                                await triggerPerfectFill(mainInputs[0], d); await triggerPerfectFill(mainInputs[1], m); await triggerPerfectFill(mainInputs[2], y);
                            } else {
                                await triggerPerfectFill(mainInputs[0], m); await triggerPerfectFill(mainInputs[1], d); await triggerPerfectFill(mainInputs[2], y);
                            }
                        } else if (mainInputs.length > 1 && ai.text.includes(':')) {
                            const p = ai.text.split(':');
                            for (let i = 0; i < Math.min(p.length, mainInputs.length); i++) await triggerPerfectFill(mainInputs[i], p[i].trim());
                        } else {
                            await triggerPerfectFill(mainInputs[0], ai.text);
                        }
                    }
                    updateAuditTrail(questionText, ai.text || "Selection", "Synced", ai.reasoning);
                } catch (e) { if (listBox) document.body.click(); }
            } else { updateAuditTrail(questionText, "N/A", "Skipped", ai?.reasoning); }
            await fastDelay();
        }
    } finally { isUltraRunning = false; }
}

async function analyzeContext(question, context, options, qType) {
    return new Promise(rs => {
        chrome.runtime.sendMessage({ action: "fetch_ai_answer", question: JSON.stringify({ question, type: qType, options }), context: context }, (res) => rs(res?.answer || null));
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "fill_form") { fillForm(msg.context); sendResponse({ status: "Ultra mode running." }); }
});
