// GoPhishFree Popup Dashboard Script

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  
  document.getElementById('refresh-btn').addEventListener('click', loadDashboard);
  document.getElementById('clear-btn').addEventListener('click', clearHistory);
});

function loadDashboard() {
  chrome.runtime.sendMessage({ action: 'getScanHistory' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading dashboard:', chrome.runtime.lastError);
      return;
    }
    
    const { history, flaggedCount, totalScanned } = response;
    
    // Update stats
    document.getElementById('total-scanned').textContent = totalScanned || 0;
    document.getElementById('flagged-count').textContent = flaggedCount || 0;
    
    // Display flagged emails
    displayFlaggedEmails(history || []);
  });
}

function displayFlaggedEmails(history) {
  const flaggedList = document.getElementById('flagged-list');
  
  // Filter flagged emails (risk score >= 70)
  const flagged = history
    .filter(item => item.riskScore >= 70)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20); // Show last 20
  
  if (flagged.length === 0) {
    flaggedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📧</div>
        <div>No flagged emails yet</div>
        <div style="font-size: 11px; margin-top: 5px;">Open emails in Gmail to scan them</div>
      </div>
    `;
    return;
  }
  
  flaggedList.innerHTML = flagged.map(item => {
    const riskLevel = item.riskScore >= 70 ? 'high' : 
                     item.riskScore >= 40 ? 'medium' : 'low';
    const date = new Date(item.timestamp);
    const timeStr = formatTime(date);
    
    return `
      <div class="flagged-item" data-message-id="${item.messageId || ''}">
        <div class="flagged-header">
          <div class="flagged-domain">${escapeHtml(item.senderDomain || 'Unknown')}</div>
          <div class="flagged-score ${riskLevel}">${item.riskScore}</div>
        </div>
        ${item.senderDisplayName ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${escapeHtml(item.senderDisplayName)}</div>` : ''}
        ${item.reasons && item.reasons.length > 0 ? `
          <div class="flagged-reason">${escapeHtml(item.reasons[0])}</div>
        ` : ''}
        <div class="flagged-time">${timeStr}</div>
      </div>
    `;
  }).join('');
  
  // Add click handlers to open emails in Gmail
  flaggedList.querySelectorAll('.flagged-item').forEach(item => {
    item.addEventListener('click', () => {
      const messageId = item.getAttribute('data-message-id');
      if (messageId) {
        chrome.tabs.create({
          url: `https://mail.google.com/mail/u/0/#inbox/${messageId}`
        });
        window.close();
      }
    });
  });
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all scan history?')) {
    chrome.runtime.sendMessage({ action: 'clearHistory' }, (response) => {
      if (response && response.success) {
        loadDashboard();
      }
    });
  }
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
