// Background service worker for GoPhishFree
chrome.runtime.onInstalled.addListener(() => {
  console.log('GoPhishFree extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    scanHistory: [],
    flaggedCount: 0,
    totalScanned: 0
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveScanResult') {
    chrome.storage.local.get(['scanHistory', 'flaggedCount', 'totalScanned'], (data) => {
      const history = data.scanHistory || [];
      const flaggedCount = data.flaggedCount || 0;
      const totalScanned = data.totalScanned || 0;
      
      const scanResult = {
        ...request.data,
        timestamp: Date.now(),
        messageId: request.messageId || `msg_${Date.now()}`
      };
      
      history.push(scanResult);
      
      // Update flagged count if risk score >= 70
      const newFlaggedCount = scanResult.riskScore >= 70 
        ? flaggedCount + 1 
        : flaggedCount;
      
      chrome.storage.local.set({
        scanHistory: history,
        flaggedCount: newFlaggedCount,
        totalScanned: totalScanned + 1
      }, () => {
        sendResponse({ success: true, flaggedCount: newFlaggedCount });
      });
    });
    
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getScanHistory') {
    chrome.storage.local.get(['scanHistory', 'flaggedCount', 'totalScanned'], (data) => {
      sendResponse({
        history: data.scanHistory || [],
        flaggedCount: data.flaggedCount || 0,
        totalScanned: data.totalScanned || 0
      });
    });
    return true;
  }
  
  if (request.action === 'clearHistory') {
    chrome.storage.local.set({
      scanHistory: [],
      flaggedCount: 0,
      totalScanned: 0
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
