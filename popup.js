// GoPhishFree Fish Tank Dashboard Script

// Fish type definitions
const FISH_TYPES = {
  friendly: {
    emoji: '🐟',
    name: 'Friendly Fish',
    description: 'A safe email companion',
    minRisk: 0,
    maxRisk: 39,
    rarity: 'common',
    swimSpeed: { min: 15, max: 25 }
  },
  suspicious: {
    emoji: '🐠',
    name: 'Suspicious Fish',
    description: 'Something seems fishy...',
    minRisk: 40,
    maxRisk: 69,
    rarity: 'uncommon',
    swimSpeed: { min: 12, max: 20 }
  },
  phishy: {
    emoji: '🐡',
    name: 'Phishy Puffer',
    description: 'Definitely a phishing attempt!',
    minRisk: 70,
    maxRisk: 89,
    rarity: 'rare',
    swimSpeed: { min: 10, max: 18 }
  },
  shark: {
    emoji: '🦈',
    name: 'Mega Phish Shark',
    description: 'Extremely dangerous phishing!',
    minRisk: 90,
    maxRisk: 100,
    rarity: 'legendary',
    swimSpeed: { min: 8, max: 14 }
  }
};

// Track active fish in tank
let activeFish = [];
let fishIdCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadFishTank();
  initBubbles();
  
  document.getElementById('clear-btn').addEventListener('click', clearHistory);
  
  // Refresh periodically
  setInterval(loadFishTank, 30000);
});

/**
 * Initialize bubble effect
 */
function initBubbles() {
  const bubblesContainer = document.getElementById('bubbles');
  
  function createBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = Math.random() * 8 + 4;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 60 + 10}px`;
    bubble.style.animationDuration = `${Math.random() * 3 + 4}s`;
    bubblesContainer.appendChild(bubble);
    
    setTimeout(() => bubble.remove(), 7000);
  }
  
  // Create bubbles periodically
  setInterval(createBubble, 800);
  
  // Initial bubbles
  for (let i = 0; i < 5; i++) {
    setTimeout(createBubble, i * 200);
  }
}

/**
 * Load fish tank data from storage
 */
function loadFishTank() {
  chrome.runtime.sendMessage({ action: 'getFishCollection' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading fish tank:', chrome.runtime.lastError);
      return;
    }
    
    const { fishCollection, totalScanned, recentCatches } = response || {};
    
    // Update stats
    document.getElementById('total-scanned').textContent = totalScanned || 0;
    
    // Calculate total fish caught
    const totalFish = Object.values(fishCollection || {}).reduce((sum, count) => sum + count, 0);
    document.getElementById('fish-caught').textContent = totalFish;
    
    // Update fish type counts
    updateFishTypeCounts(fishCollection || {});
    
    // Populate fish tank
    populateFishTank(fishCollection || {});
    
    // Show recent catches
    displayRecentCatches(recentCatches || []);
  });
}

/**
 * Update fish type counts in collection panel
 */
function updateFishTypeCounts(collection) {
  let typesCollected = 0;
  
  Object.keys(FISH_TYPES).forEach(type => {
    const count = collection[type] || 0;
    document.getElementById(`count-${type}`).textContent = count;
    
    const typeEl = document.querySelector(`.fish-type[data-type="${type}"]`);
    if (count > 0) {
      typeEl.classList.remove('locked');
      typesCollected++;
    } else {
      typeEl.classList.add('locked');
    }
  });
  
  document.getElementById('collection-count').textContent = 
    `${typesCollected} / ${Object.keys(FISH_TYPES).length} types`;
}

/**
 * Populate fish tank with swimming fish
 */
function populateFishTank(collection) {
  const container = document.getElementById('fish-container');
  const emptyTank = document.getElementById('empty-tank');
  
  // Clear existing fish
  container.querySelectorAll('.fish').forEach(f => f.remove());
  activeFish = [];
  
  const totalFish = Object.values(collection).reduce((sum, count) => sum + count, 0);
  
  if (totalFish === 0) {
    emptyTank.style.display = 'block';
    return;
  }
  
  emptyTank.style.display = 'none';
  
  // Add fish to tank (max 15 visible at once for performance)
  const maxVisible = 15;
  let fishToShow = [];
  
  Object.entries(collection).forEach(([type, count]) => {
    if (count > 0) {
      // Show proportional representation, at least 1 of each type caught
      const showCount = Math.min(count, Math.ceil(count / totalFish * maxVisible) || 1);
      for (let i = 0; i < Math.min(showCount, 5); i++) {
        fishToShow.push(type);
      }
    }
  });
  
  // Shuffle and limit
  fishToShow = shuffleArray(fishToShow).slice(0, maxVisible);
  
  // Spawn fish with delays for natural feel
  fishToShow.forEach((type, index) => {
    setTimeout(() => spawnFish(type, container), index * 300);
  });
}

/**
 * Spawn a fish in the tank
 */
function spawnFish(type, container) {
  const fishData = FISH_TYPES[type];
  if (!fishData) return;
  
  const fish = document.createElement('div');
  fish.className = 'fish';
  fish.dataset.type = type;
  fish.dataset.fishId = fishIdCounter++;
  fish.textContent = fishData.emoji;
  
  // Random position
  const containerRect = container.getBoundingClientRect();
  const topPosition = Math.random() * 70 + 10; // 10-80% from top
  fish.style.top = `${topPosition}%`;
  
  // Random direction and speed
  const goingRight = Math.random() > 0.5;
  const speed = Math.random() * (fishData.swimSpeed.max - fishData.swimSpeed.min) + fishData.swimSpeed.min;
  
  fish.classList.add(goingRight ? 'swimming-right' : 'swimming-left');
  fish.style.animationDuration = `${speed}s`;
  fish.style.animationDelay = `-${Math.random() * speed}s`;
  
  // Size variation
  const sizeVariation = 0.8 + Math.random() * 0.4;
  fish.style.fontSize = `${32 * sizeVariation}px`;
  
  // Tooltip on hover
  fish.addEventListener('mouseenter', (e) => showFishTooltip(e, type));
  fish.addEventListener('mouseleave', hideFishTooltip);
  
  container.appendChild(fish);
  activeFish.push(fish);
  
  // Re-spawn when animation ends
  fish.addEventListener('animationiteration', () => {
    // Randomly change direction sometimes
    if (Math.random() < 0.3) {
      const newTop = Math.random() * 70 + 10;
      fish.style.top = `${newTop}%`;
    }
  });
}

/**
 * Show tooltip for fish
 */
function showFishTooltip(e, type) {
  const fishData = FISH_TYPES[type];
  const tooltip = document.getElementById('fish-tooltip');
  
  tooltip.querySelector('.tooltip-title').textContent = fishData.name;
  tooltip.querySelector('.tooltip-detail').textContent = fishData.description;
  
  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top - 50}px`;
  tooltip.classList.add('show');
}

/**
 * Hide fish tooltip
 */
function hideFishTooltip() {
  document.getElementById('fish-tooltip').classList.remove('show');
}

/**
 * Display recent catches list
 */
function displayRecentCatches(catches) {
  const recentList = document.getElementById('recent-list');
  
  // Get last 10 catches, sorted by time
  const recent = catches
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
  
  if (recent.length === 0) {
    recentList.innerHTML = '<div class="empty-recent">No catches yet - start scanning!</div>';
    return;
  }
  
  recentList.innerHTML = recent.map(item => {
    const fishType = getFishTypeFromRisk(item.riskScore);
    const fishData = FISH_TYPES[fishType];
    const riskLevel = item.riskScore >= 70 ? 'high' : 
                     item.riskScore >= 40 ? 'medium' : 'low';
    const timeStr = formatTime(new Date(item.timestamp));
    
    return `
      <div class="recent-item" data-message-id="${item.messageId || ''}">
        <span class="recent-fish">${fishData.emoji}</span>
        <div class="recent-info">
          <div class="recent-domain">${escapeHtml(item.senderDomain || 'Unknown')}</div>
          <div class="recent-time">${timeStr}</div>
        </div>
        <span class="recent-score ${riskLevel}">${item.riskScore}</span>
      </div>
    `;
  }).join('');
  
  // Click to open email
  recentList.querySelectorAll('.recent-item').forEach(item => {
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

/**
 * Get fish type based on risk score
 */
function getFishTypeFromRisk(riskScore) {
  if (riskScore >= 90) return 'shark';
  if (riskScore >= 70) return 'phishy';
  if (riskScore >= 40) return 'suspicious';
  return 'friendly';
}

/**
 * Clear all history
 */
function clearHistory() {
  if (confirm('Are you sure you want to release all your fish and clear history?')) {
    chrome.runtime.sendMessage({ action: 'clearHistory' }, (response) => {
      if (response && response.success) {
        loadFishTank();
      }
    });
  }
}

/**
 * Format time for display
 */
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

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Shuffle array helper
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
