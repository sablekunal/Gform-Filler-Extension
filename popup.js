// Load previously saved context when popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['savedContext'], (result) => {
        if (result.savedContext) {
            document.getElementById('contextInput').value = result.savedContext;
        }
    });
});

document.getElementById('saveButton').addEventListener('click', () => {
    const context = document.getElementById('contextInput').value.trim();
    const statusDiv = document.getElementById('status');

    if (!context) {
        statusDiv.innerText = 'Nothing to save.';
        statusDiv.style.color = '#5f6368';
        return;
    }

    chrome.storage.local.set({ savedContext: context }, () => {
        statusDiv.innerText = 'Data saved successfully!';
        statusDiv.style.color = '#188038';
        setTimeout(() => {
            if (statusDiv.innerText === 'Data saved successfully!') {
                statusDiv.innerText = '';
            }
        }, 2000); // Clear success message after 2 secs
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

    // Save the context for next time
    chrome.storage.local.set({ savedContext: context });

    statusDiv.innerText = 'Analyzing & filling form...';
    statusDiv.style.color = '#1a73e8';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url.includes("docs.google.com/forms")) {
            statusDiv.innerText = 'Please navigate to a Google Form layout.';
            statusDiv.style.color = '#d93025';
            btn.disabled = false;
            btn.style.opacity = '1';
            return;
        }

        chrome.runtime.sendMessage({ action: "start_filling", context: context, tabId: tab.id }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.innerText = 'Error: Refresh the page and try again.';
                statusDiv.style.color = '#d93025';
            } else {
                statusDiv.innerText = 'Form filling completed!';
                statusDiv.style.color = '#188038';
            }
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    } catch (error) {
        statusDiv.innerText = 'An error occurred accessing the active tab.';
        statusDiv.style.color = '#d93025';
        btn.disabled = false;
        btn.style.opacity = '1';
    }
});
