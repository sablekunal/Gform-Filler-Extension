// Load previously saved context when popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['savedContext'], (result) => {
        if (result.savedContext) {
            document.getElementById('contextInput').value = result.savedContext;
            document.getElementById('saveStatus').innerText = 'DATA LOADED';
        } else {
            document.getElementById('saveStatus').innerText = 'READY';
        }
    });
});

// Auto-save context on input
document.getElementById('contextInput').addEventListener('input', () => {
    const context = document.getElementById('contextInput').value;
    chrome.storage.local.set({ savedContext: context }, () => {
        document.getElementById('saveStatus').innerText = 'SAVING...';
        setTimeout(() => {
            document.getElementById('saveStatus').innerText = 'DATA SAVED';
        }, 500);
    });
});

// Clear Data
document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('contextInput').value = '';
    chrome.storage.local.set({ savedContext: '' }, () => {
        document.getElementById('saveStatus').innerText = 'DATA CLEARED';
        const statusDiv = document.getElementById('status');
        statusDiv.innerText = 'All cleared';
        statusDiv.style.color = '#5f6368';
        setTimeout(() => { statusDiv.innerText = ''; }, 2000);
    });
});

document.getElementById('startButton').addEventListener('click', async () => {
    const context = document.getElementById('contextInput').value.trim();
    const statusDiv = document.getElementById('status');
    const btn = document.getElementById('startButton');

    if (!context) {
        statusDiv.innerText = 'Please enter context data first.';
        statusDiv.style.color = '#d93025';
        return;
    }

    // Visual feedback for start
    statusDiv.innerText = 'Analyzing & filling form...';
    statusDiv.style.color = '#0d9af2';
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.innerText = 'PROMPT SENT...';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || (!tab.url.includes("docs.google.com/forms") && !tab.url.includes("forms.gle"))) {
            statusDiv.innerText = 'Navigate to a Google Form first.';
            statusDiv.style.color = '#d93025';
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerText = 'Start Perfect Fill';
            return;
        }

        chrome.runtime.sendMessage({ action: "start_filling", context: context, tabId: tab.id }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.innerText = 'Error: Refresh the page and try again.';
                statusDiv.style.color = '#d93025';
            } else {
                statusDiv.innerText = 'ULTRA-FILL INITIATED';
                statusDiv.style.color = '#22c55e';
            }
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = '<span class="material-symbols-outlined">ev_station</span> Start Perfect Fill';
        });
    } catch (error) {
        statusDiv.innerText = 'Extension error: Reload page.';
        statusDiv.style.color = '#d93025';
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = 'Start Perfect Fill';
    }
});
