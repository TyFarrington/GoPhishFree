// GoPhishFree Background Service Worker
// Handles scan results and fish collection management

// Fish type mappings based on risk score
function getFishTypeFromRisk(riskScore) {
  if (riskScore >= 90) return 'shark';
  if (riskScore >= 70) return 'phishy';
  if (riskScore >= 40) return 'suspicious';
  return 'friendly';
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('GoPhishFree extension installed');
  
  // Initialize storage with fish collection
  chrome.storage.local.set({
    scanHistory: [],
    flaggedCount: 0,
    totalScanned: 0,
    fishCollection: {
      friendly: 0,
      suspicious: 0,
      phishy: 0,
      shark: 0
    },
    recentCatches: []
  });
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Save scan result and add fish to collection
  if (request.action === 'saveScanResult') {
    chrome.storage.local.get(['scanHistory', 'flaggedCount', 'totalScanned', 'fishCollection', 'recentCatches'], (data) => {
      const history = data.scanHistory || [];
      const flaggedCount = data.flaggedCount || 0;
      const totalScanned = data.totalScanned || 0;
      const fishCollection = data.fishCollection || { friendly: 0, suspicious: 0, phishy: 0, shark: 0 };
      const recentCatches = data.recentCatches || [];
      
      const scanResult = {
        ...request.data,
        timestamp: Date.now(),
        messageId: request.messageId || `msg_${Date.now()}`
      };
      
      history.push(scanResult);
      
      // Determine fish type and add to collection
      const fishType = getFishTypeFromRisk(scanResult.riskScore);
      fishCollection[fishType] = (fishCollection[fishType] || 0) + 1;
      
      // Add to recent catches
      const catchRecord = {
        messageId: scanResult.messageId,
        senderDomain: scanResult.senderDomain,
        senderDisplayName: scanResult.senderDisplayName,
        riskScore: scanResult.riskScore,
        fishType: fishType,
        timestamp: scanResult.timestamp
      };
      recentCatches.push(catchRecord);
      
      // Keep only last 100 catches
      if (recentCatches.length > 100) {
        recentCatches.shift();
      }
      
      // Update flagged count if risk score >= 70
      const newFlaggedCount = scanResult.riskScore >= 70 
        ? flaggedCount + 1 
        : flaggedCount;
      
      chrome.storage.local.set({
        scanHistory: history,
        flaggedCount: newFlaggedCount,
        totalScanned: totalScanned + 1,
        fishCollection: fishCollection,
        recentCatches: recentCatches
      }, () => {
        sendResponse({ 
          success: true, 
          flaggedCount: newFlaggedCount,
          fishType: fishType,
          fishCollection: fishCollection
        });
      });
    });
    
    return true; // Keep channel open for async response
  }
  
  // Get scan history (legacy support)
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
  
  // Get fish collection for fish tank
  if (request.action === 'getFishCollection') {
    chrome.storage.local.get(['fishCollection', 'totalScanned', 'recentCatches'], (data) => {
      sendResponse({
        fishCollection: data.fishCollection || { friendly: 0, suspicious: 0, phishy: 0, shark: 0 },
        totalScanned: data.totalScanned || 0,
        recentCatches: data.recentCatches || []
      });
    });
    return true;
  }
  
  // Clear all history and fish
  if (request.action === 'clearHistory') {
    chrome.storage.local.set({
      scanHistory: [],
      flaggedCount: 0,
      totalScanned: 0,
      fishCollection: {
        friendly: 0,
        suspicious: 0,
        phishy: 0,
        shark: 0
      },
      recentCatches: []
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Get specific fish stats
  if (request.action === 'getFishStats') {
    chrome.storage.local.get(['fishCollection', 'recentCatches'], (data) => {
      const collection = data.fishCollection || { friendly: 0, suspicious: 0, phishy: 0, shark: 0 };
      const totalFish = Object.values(collection).reduce((sum, count) => sum + count, 0);
      const typesCollected = Object.values(collection).filter(count => count > 0).length;
      
      sendResponse({
        fishCollection: collection,
        totalFish: totalFish,
        typesCollected: typesCollected,
        recentCatches: data.recentCatches || []
      });
    });
    return true;
  }
});
