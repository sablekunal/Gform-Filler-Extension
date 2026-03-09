// AI Simulation - Maps context data to question using simplistic word matching heuristic
// AI Integration - Asks Backend API for the answer based on context
// AI Integration - Delegates Backend API request to background worker to bypass CSP
async function analyzeContext(question, context, options = null, qType = "text") {
    updateSidebarStatus(`Thinking: ${question.substring(0, 20)}...`);
    return new Promise((resolve) => {
        let questionPrompt = "Question: " + question + "\nType: " + qType;
        if (options && options.length > 0) {
            questionPrompt += "\nOptions: \n" + options.map((opt, i) => `[${i}] ${opt}`).join("\n");
        }
        chrome.runtime.sendMessage({
            action: "fetch_ai_answer",
            question: questionPrompt,
            context: context
        }, (response) => {
            if (chrome.runtime.lastError || !response) {
                console.error("Runtime error passing to background:", chrome.runtime.lastError);
                resolve(null);
            } else {
                resolve(response.answer);
            }
        });
    });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomBotDelay = () => delay(Math.floor(Math.random() * (150 - 50 + 1)) + 50);

// Human-Speed Execution Engine text fill (React State bypass)
function fillText(el, text) {
    el.focus();
    document.execCommand('insertText', false, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
}

// Precise UI Observer for dynamic dropdown options
function waitForDropdown() {
    return new Promise((resolve) => {
        const check = () => {
            const opts = Array.from(document.querySelectorAll('div[role="option"]')).filter(opt => opt.offsetParent !== null);
            if (opts.length > 0) resolve(opts);
            else setTimeout(check, 50);
        };
        check();
        // Fallback resolve after 1s to prevent infinite hang
        setTimeout(() => resolve([]), 1000);
    });
}

// Central safe click dispatcher fulfilling the strictly prohibited instruction 
function safeClick(element) {
    if (!element) return;
    const text = (element.innerText || '').toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();
    const role = (element.getAttribute('role') || '').toLowerCase();

    // Strict block based on submit keyword check
    if (text.includes('submit') || type === 'submit') {
        console.warn("Safety constraint triggered: Attempted to click a node with submit text/type.");
        return;
    }

    element.click();
}

// SideBar UI Logic
function initSidebar() {
    if (document.getElementById('gform-filler-sidebar')) return;

    const sidebar = document.createElement('div');
    sidebar.id = 'gform-filler-sidebar';
    Object.assign(sidebar.style, {
        position: 'fixed',
        top: '20px',
        left: '20px',
        width: '260px',
        backgroundColor: '#ffffff',
        border: '1px solid #dadce0',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        padding: '16px',
        fontFamily: 'Arial, -apple-system, sans-serif',
        zIndex: '9999999',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    });

    const title = document.createElement('div');
    title.innerText = 'GForm AI Agent';
    title.style.fontWeight = 'bold';
    title.style.color = '#1a73e8';
    title.style.fontSize = '14px';
    sidebar.appendChild(title);

    const statusRow = document.createElement('div');
    statusRow.style.display = 'flex';
    statusRow.style.alignItems = 'center';
    statusRow.style.gap = '8px';
    statusRow.style.fontSize = '12px';

    const indicator = document.createElement('div');
    indicator.id = 'gform-agent-indicator';
    Object.assign(indicator.style, {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: '#fbbc04' // orange idle
    });

    const statusText = document.createElement('span');
    statusText.id = 'gform-agent-text';
    statusText.innerText = 'Idle';
    statusText.style.color = '#5f6368';

    statusRow.appendChild(indicator);
    statusRow.appendChild(statusText);
    sidebar.appendChild(statusRow);

    document.body.appendChild(sidebar);
}

function updateSidebarStatus(text, state = 'working') {
    initSidebar();
    const textEl = document.getElementById('gform-agent-text');
    const indicatorEl = document.getElementById('gform-agent-indicator');

    if (textEl) textEl.innerText = text;
    if (indicatorEl) {
        if (state === 'idle') indicatorEl.style.backgroundColor = '#fbbc04'; // orange
        if (state === 'working') indicatorEl.style.backgroundColor = '#1a73e8'; // blue
        if (state === 'done') indicatorEl.style.backgroundColor = '#188038'; // green
        if (state === 'error') indicatorEl.style.backgroundColor = '#d93025'; // red
    }
}

function injectInlineStatus(qNode, text, color) {
    let statusBadge = qNode.querySelector('.gform-inline-status');
    if (!statusBadge) {
        statusBadge = document.createElement('div');
        statusBadge.className = 'gform-inline-status';
        Object.assign(statusBadge.style, {
            marginTop: '8px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '4px',
            display: 'inline-block',
            backgroundColor: '#f1f3f4',
            color: '#3c4043'
        });
        const titleElement = qNode.querySelector('.M7eMe') || qNode.querySelector('div[role="heading"]') || qNode.querySelector('span[dir="auto"]');
        if (titleElement) {
            titleElement.parentElement.appendChild(statusBadge);
        }
    }
    statusBadge.innerText = text;
    statusBadge.style.color = color;
}

async function fillForm(context) {
    initSidebar();
    updateSidebarStatus('Scanning form...', 'working');

    // Google forms structure: outer container .geS5n
    let questionsList = document.querySelectorAll('.geS5n');
    if (questionsList.length === 0) {
        questionsList = document.querySelectorAll('div[role="listitem"]');
    }
    const questions = Array.from(questionsList);
    if (!questions.length) {
        updateSidebarStatus('Idle - No questions found', 'idle');
        alert("No form questions found.");
        return false;
    }

    const unanswered = [];

    for (let i = 0; i < questions.length; i++) {
        const qNode = questions[i];

        // Exclude file upload
        if (qNode.querySelector('input[type="file"]')) {
            unanswered.push("File Uploads not supported");
            continue;
        }

        const titleElement = qNode.querySelector('.M7eMe') || qNode.querySelector('div[role="heading"]') || qNode.querySelector('span[dir="auto"]');
        if (!titleElement) continue;

        const questionText = titleElement.innerText.replace(/\n/g, ' ').trim();
        if (!questionText) continue;

        // Locate Dropdown early to extract options
        const listBox = qNode.querySelector('.MocG8c, div[role="listbox"]');
        let dropdownOptionsNodes = [];
        let extractedDropdownOptions = [];

        if (listBox) {
            safeClick(listBox); // Trigger open dropdown
            dropdownOptionsNodes = await waitForDropdown(); 
            extractedDropdownOptions = dropdownOptionsNodes.map(opt => (opt.getAttribute('data-value') || opt.innerText || '').trim());
            
            safeClick(document.body); // strictly close it during LLM wait
            await delay(100);
        }

        // Extract options for multiple choice / checkbox to send to LLM
        const optionNodes = Array.from(qNode.querySelectorAll('.docssharedWizToggleLabeledContainer, [role="radio"], [role="checkbox"]'));
        let optionsList = optionNodes.map(opt => {
            const label = opt.querySelector('.aDTYNe') || opt; // inner text span
            return label.innerText ? label.innerText.trim() : (opt.getAttribute('data-value') || "Empty Option");
        });

        if (extractedDropdownOptions.length > 0) {
            optionsList = extractedDropdownOptions;
        }

        let qType = "text input";
        if (extractedDropdownOptions.length > 0) qType = "dropdown";
        else if (optionNodes.length > 0) {
            const isCheckbox = qNode.querySelector('div[role="checkbox"]') !== null || qNode.querySelector('input[type="checkbox"]') !== null;
            qType = isCheckbox ? "checkbox (multiple select)" : "radio (single select)";
            if (isCheckbox) questionText += " [Notice: This is a Multi-Select Option field. Select all indices that apply.]";
        }

        injectInlineStatus(qNode, "Thinking...", "#fbbc04"); // Orange
        const aiResponse = await analyzeContext(questionText, context, optionsList, qType);

        if (aiResponse && aiResponse.skip === true) {
            injectInlineStatus(qNode, "Skipped by Conditional Logic", "#5f6368"); // Gray
            if (extractedDropdownOptions.length > 0) {
                safeClick(document.body); // close dropdown
                await delay(200);
            }
            unanswered.push(questionText + " (Skipped Constraint)");
            continue;
        }

        if (!aiResponse || (!aiResponse.text && (!aiResponse.indices || aiResponse.indices.length === 0))) {
            injectInlineStatus(qNode, "Failed AI Match", "#d93025"); // Red
            if (extractedDropdownOptions.length > 0) {
                safeClick(document.body); // close dropdown
                await delay(200);
            }
            unanswered.push(questionText);
            continue;
        }

        injectInlineStatus(qNode, "Filling...", "#1a73e8"); // Blue
        updateSidebarStatus(`Filling: ${questionText.substring(0, 15)}...`, 'working');
        let answered = false;

        // Apply Indices (Dropdown, Radio, Checkbox)
        if (aiResponse.indices && aiResponse.indices.length > 0) {
            if (extractedDropdownOptions.length > 0 && listBox) {
                for (let idx of aiResponse.indices) {
                    safeClick(listBox); // 1. Click the role="listbox"
                    const activeOptions = await waitForDropdown(); // 2 & 3. Wait for options and query body
                    
                    if (activeOptions[idx]) {
                        safeClick(activeOptions[idx]); // 4. Click it
                        answered = true;
                        await delay(100); // 5. Wait 100ms for the menu to collapse
                    }
                }
                if (!answered) {
                    safeClick(document.body);
                    await delay(200);
                }
            } else if (optionNodes.length > 0) {
                for (let idx of aiResponse.indices) {
                    if (optionNodes[idx]) {
                        const opt = optionNodes[idx];
                        const isChecked = opt.getAttribute('aria-checked') === "true" || opt.classList.contains('isChecked');
                        if (!isChecked) {
                            safeClick(opt);
                            answered = true;
                            await delay(400);
                        }
                    }
                }
            }
        }

        // Apply Text Fallback (Input, Date, Time)
        if (!answered && aiResponse.text && aiResponse.text !== "null") {
            const textInputs = qNode.querySelectorAll('input[type="text"], input[type="email"], input[type="url"], input[type="number"], textarea, input.whsOnd, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="file"])');
            for (const input of textInputs) {
                fillText(input, aiResponse.text);
                answered = true;
                await delay(400);
                break;
            }
        }

        // 5. Grid/Scale formats (tabled matrices with row options)
        const gridRows = Array.from(qNode.querySelectorAll('.E2CuFe, div[role="row"]'));
        if (gridRows.length > 0 && !answered) {
            for (let r = 0; r < gridRows.length; r++) {
                const row = gridRows[r];
                const rowHeader = row.querySelector('.l4V7wb, div[role="rowheader"], th');
                if (rowHeader) {
                    const rowText = rowHeader.innerText.trim();
                    if (!rowText) continue;

                    const rowInputs = Array.from(row.querySelectorAll('.T5pZmf, div[role="radio"], div[role="checkbox"], input[type="radio"], input[type="checkbox"]'));
                    const rowOptions = rowInputs.map(input => input.getAttribute('data-value') || input.getAttribute('aria-label') || (input.nextElementSibling ? input.nextElementSibling.innerText : '') || "Empty Option");

                    const rowAiResponse = await analyzeContext(questionText + " - " + rowText, context, rowOptions, "grid row (radio)");

                    if (rowAiResponse && rowAiResponse.status !== "fail" && rowAiResponse.indices && rowAiResponse.indices.length > 0) {
                        for (let idx of rowAiResponse.indices) {
                            if (rowInputs[idx]) {
                                safeClick(rowInputs[idx]);
                                answered = true;
                                await randomBotDelay();
                            }
                        }
                    }
                }
            }
        }

        if (answered) {
            injectInlineStatus(qNode, "Filled ✅", "#188038"); // Green
        } else {
            injectInlineStatus(qNode, "Extraction Failed", "#d93025");
            unanswered.push(questionText);
        }

        // Anti-Bot Mimicry
        await randomBotDelay();
    }

    updateSidebarStatus('Finished!', 'done');
    showVerificationOverlay(unanswered, questions.length);
    return true;
}

function showVerificationOverlay(unanswered, total) {
    if (document.getElementById('gform-filler-report-overlay')) return;

    const answeredCount = total - unanswered.length;
    const overlay = document.createElement('div');
    overlay.id = 'gform-filler-report-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '340px',
        backgroundColor: '#ffffff',
        border: '1px solid #dadce0',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
        padding: '20px',
        fontFamily: 'Arial, -apple-system, sans-serif',
        zIndex: '9999999'
    });

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const title = document.createElement('h3');
    title.innerText = 'Gform Filler Report';
    title.style.margin = '0';
    title.style.fontSize = '16px';
    title.style.color = '#1a73e8';

    header.appendChild(title);
    overlay.appendChild(header);

    const hr = document.createElement('hr');
    hr.style.border = 'none';
    hr.style.borderTop = '1px solid #eee';
    hr.style.margin = '12px 0';
    overlay.appendChild(hr);

    const stats = document.createElement('p');
    stats.innerText = `Fields Filled: ${answeredCount} / ${total}`;
    stats.style.fontWeight = 'bold';
    stats.style.margin = '0 0 10px 0';
    overlay.appendChild(stats);

    if (unanswered.length > 0) {
        const warning = document.createElement('p');
        warning.innerText = 'Skipped Fields:';
        warning.style.fontSize = '14px';
        warning.style.margin = '0 0 10px 0';
        warning.style.color = '#d93025';
        warning.style.fontWeight = '500';
        overlay.appendChild(warning);

        const list = document.createElement('ul');
        list.style.margin = '0 0 16px 0';
        list.style.paddingLeft = '20px';
        list.style.fontSize = '13px';
        list.style.color = '#3c4043';
        list.style.maxHeight = '150px';
        list.style.overflowY = 'auto';

        unanswered.forEach(q => {
            const li = document.createElement('li');
            li.style.marginBottom = '6px';
            li.innerText = q;
            list.appendChild(li);
        });
        overlay.appendChild(list);
    } else {
        const success = document.createElement('p');
        success.innerText = '✅ All questions were filled successfully!';
        success.style.fontSize = '14px';
        success.style.color = '#188038';
        success.style.fontWeight = '500';
        overlay.appendChild(success);
    }

    const verificationPrompt = document.createElement('div');
    verificationPrompt.innerText = 'Action Required: Please Review & Manually Submit.';
    verificationPrompt.style.fontWeight = '600';
    verificationPrompt.style.fontSize = '15px';
    verificationPrompt.style.marginTop = '16px';
    verificationPrompt.style.paddingTop = '16px';
    verificationPrompt.style.borderTop = '1px dashed #ccc';
    verificationPrompt.style.color = '#1a73e8';
    overlay.appendChild(verificationPrompt);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Dismiss Notification';
    Object.assign(closeBtn.style, {
        marginTop: '16px',
        padding: '10px 16px',
        backgroundColor: '#1a73e8',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: '500',
        color: 'white',
        width: '100%',
        fontSize: '14px'
    });
    closeBtn.onclick = () => overlay.remove();
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
}

// Background Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fill_form') {
        fillForm(request.context).then(() => {
            sendResponse({ status: 'completed' });
        });
        return true;
    }
});
