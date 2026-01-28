// GoPhishFree Content Script for Gmail
// Detects opened emails and extracts features for phishing detection

(function() {
  'use strict';
  
  // FeatureExtractor is loaded via content_scripts in manifest
  if (typeof FeatureExtractor === 'undefined') {
    console.error('GoPhishFree: FeatureExtractor not loaded');
    return;
  }
  
  const extractor = new FeatureExtractor();
  let currentEmailId = null;
  let scanInProgress = false;
  
  // Initialize UI
  initUI();
  
  // Monitor Gmail for email opens
  observeGmailChanges();
    
  /**
   * Initialize UI elements
   */
  function initUI() {
      // Create overlay for side panel
      const overlay = document.createElement('div');
      overlay.className = 'gophishfree-overlay';
      overlay.id = 'gophishfree-overlay';
      document.body.appendChild(overlay);
      
      // Create side panel
      const sidepanel = document.createElement('div');
      sidepanel.className = 'gophishfree-sidepanel';
      sidepanel.id = 'gophishfree-sidepanel';
      sidepanel.innerHTML = `
        <div class="gophishfree-sidepanel-header">
          <h2>GoPhishFree Analysis</h2>
          <button class="gophishfree-sidepanel-close" id="gophishfree-close">×</button>
        </div>
        <div class="gophishfree-sidepanel-content" id="gophishfree-content">
          <div class="gophishfree-score-display">
            <div>Risk Score</div>
            <div class="gophishfree-score-value" id="gophishfree-score">-</div>
            <div id="gophishfree-level">-</div>
          </div>
          <div class="gophishfree-reasons">
            <h3>Risk Reasons</h3>
            <div id="gophishfree-reasons-list"></div>
          </div>
          <div class="gophishfree-links">
            <h3>Suspicious Links</h3>
            <div id="gophishfree-links-list"></div>
          </div>
        </div>
      `;
      document.body.appendChild(sidepanel);
      
      // Close button handler
      document.getElementById('gophishfree-close').addEventListener('click', closeSidePanel);
    overlay.addEventListener('click', closeSidePanel);
  }
  
  /**
   * Observe Gmail DOM for email opens
   */
  function observeGmailChanges() {
      // Check URL for email view
      checkEmailView();
      
      // Monitor URL changes (Gmail uses pushState)
      let lastUrl = location.href;
      setInterval(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          setTimeout(checkEmailView, 500);
        }
      }, 1000);
      
      // Also observe DOM mutations
      const observer = new MutationObserver(() => {
        checkEmailView();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
    });
  }
  
  /**
   * Check if we're viewing an email and scan it
   */
  function checkEmailView() {
      // Check if we're in an email view (Gmail URL pattern)
      const urlMatch = window.location.href.match(/\/mail\/u\/\d+\/#inbox\/([a-zA-Z0-9]+)/);
      const emailId = urlMatch ? urlMatch[1] : null;
      
      // Also try to get email ID from DOM
      const emailElement = document.querySelector('[data-message-id]') || 
                          document.querySelector('[data-legacy-thread-id]');
      const domEmailId = emailElement ? 
        (emailElement.getAttribute('data-message-id') || 
         emailElement.getAttribute('data-legacy-thread-id')) : null;
      
      const activeEmailId = emailId || domEmailId;
      
      if (activeEmailId && activeEmailId !== currentEmailId && !scanInProgress) {
        currentEmailId = activeEmailId;
      setTimeout(() => scanEmail(activeEmailId), 1000); // Wait for email to load
    }
  }
  
  /**
   * Scan currently open email
   */
  async function scanEmail(emailId) {
      if (scanInProgress) return;
      scanInProgress = true;
      
      try {
        // Extract email data from Gmail DOM
        const emailData = extractEmailData();
        
        if (!emailData || !emailData.senderDomain) {
          console.log('GoPhishFree: Could not extract email data');
          scanInProgress = false;
          return;
        }
        
        // Extract features
        const features = extractor.extractEmailFeatures(emailData);
        
        // Run ML inference
        const prediction = await runInference(features);
        
        // Display results
        displayResults(prediction, emailData, emailId);
        
        // Save to storage
        chrome.runtime.sendMessage({
          action: 'saveScanResult',
          messageId: emailId,
          data: {
            senderDomain: emailData.senderDomain,
            senderDisplayName: emailData.senderDisplayName,
            riskScore: prediction.riskScore,
            riskLevel: prediction.riskLevel,
            reasons: prediction.reasons,
            linkCount: emailData.links.length,
            timestamp: Date.now()
          }
        });
        
      } catch (error) {
        console.error('GoPhishFree: Error scanning email', error);
    } finally {
      scanInProgress = false;
    }
  }
  
  /**
   * Extract email data from Gmail DOM
   */
  function extractEmailData() {
      try {
        // Extract sender information
        const senderElement = document.querySelector('[email]') || 
                             document.querySelector('.go') ||
                             document.querySelector('span[email]');
        
        let senderEmail = '';
        let senderDisplayName = '';
        
        if (senderElement) {
          senderEmail = senderElement.getAttribute('email') || 
                       senderElement.textContent.trim();
          senderDisplayName = senderElement.textContent.trim();
        }
        
        // Try alternative selectors
        const headerElements = document.querySelectorAll('h2, h3');
        for (const elem of headerElements) {
          const text = elem.textContent;
          if (text.includes('@')) {
            senderEmail = text.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || senderEmail;
            senderDisplayName = text.split('<')[0].trim() || senderDisplayName;
            break;
          }
        }
        
        // Extract domain
        const senderDomain = senderEmail.includes('@') 
          ? senderEmail.split('@')[1] 
          : null;
        
        // Extract links
        const links = [];
        const linkElements = document.querySelectorAll('a[href]');
        linkElements.forEach(link => {
          const href = link.getAttribute('href');
          const anchorText = link.textContent.trim();
          
          // Skip Gmail internal links
          if (href && !href.startsWith('#') && !href.includes('mail.google.com')) {
            links.push({
              href: href,
              anchorText: anchorText,
              url: href
            });
          }
        });
        
        // Extract text content
        const messageBody = document.querySelector('[role="main"]') || 
                           document.querySelector('.ii.gt') ||
                           document.body;
        const text = messageBody ? messageBody.textContent : '';
        
        // Extract attachments (if visible)
        const attachments = [];
        const attachmentElements = document.querySelectorAll('[data-attachment-id]');
        attachmentElements.forEach(att => {
          const filename = att.getAttribute('data-attachment-name') || 
                          att.textContent.trim();
          if (filename) {
            attachments.push({ filename });
          }
        });
        
        return {
          senderEmail,
          senderDisplayName: senderDisplayName || senderEmail,
          senderDomain,
          links,
          text,
          attachments
        };
      } catch (error) {
        console.error('GoPhishFree: Error extracting email data', error);
      return null;
    }
  }
  
  /**
   * Run ML inference (placeholder - will be implemented with actual model)
   */
  async function runInference(features) {
    // For now, use a simple rule-based approach
    // This will be replaced with actual ML model inference
    return simpleRuleBasedInference(features);
  }
  
  /**
   * Simple rule-based inference (temporary until model is loaded)
   */
  function simpleRuleBasedInference(features) {
      let riskScore = 0;
      const reasons = [];
      
      // URL-based signals
      if (features.NoHttps > 0.5) {
        riskScore += 15;
        reasons.push('Email contains non-HTTPS links');
      }
      
      if (features.IpAddress > 0.5) {
        riskScore += 20;
        reasons.push('Links use IP addresses instead of domain names');
      }
      
      if (features.SuspiciousTLD > 0.5) {
        riskScore += 15;
        reasons.push('Links use suspicious top-level domains');
      }
      
      if (features.ShortenerDomain > 0.5) {
        riskScore += 10;
        reasons.push('Links use URL shorteners');
      }
      
      if (features.AtSymbol > 0.5) {
        riskScore += 10;
        reasons.push('URLs contain @ symbols');
      }
      
      if (features.LinkMismatchRatio > 0.3) {
        riskScore += 20;
        reasons.push('Link text does not match destination domains');
      }
      
      if (features.HeaderMismatch > 0.5) {
        riskScore += 15;
        reasons.push('Sender display name does not match email domain');
      }
      
      if (features.UrgencyScore > 0) {
        riskScore += Math.min(features.UrgencyScore * 5, 15);
        reasons.push('Email contains urgency language');
      }
      
      if (features.CredentialRequestScore > 0) {
        riskScore += Math.min(features.CredentialRequestScore * 10, 20);
        reasons.push('Email requests credentials or account verification');
      }
      
      // Determine risk level
      let riskLevel = 'Low';
      if (riskScore >= 70) {
        riskLevel = 'High';
      } else if (riskScore >= 40) {
        riskLevel = 'Medium';
      }
      
      return {
        riskScore: Math.min(Math.round(riskScore), 100),
        riskLevel,
      reasons: reasons.slice(0, 5) // Top 5 reasons
    };
  }
  
  /**
   * Display results in UI
   */
  function displayResults(prediction, emailData, emailId) {
      // Update risk badge
      updateRiskBadge(prediction.riskLevel, prediction.riskScore);
      
      // Update side panel content
      const scoreEl = document.getElementById('gophishfree-score');
      const levelEl = document.getElementById('gophishfree-level');
      const reasonsEl = document.getElementById('gophishfree-reasons-list');
      const linksEl = document.getElementById('gophishfree-links-list');
      
      scoreEl.textContent = prediction.riskScore;
      scoreEl.className = `gophishfree-score-value ${prediction.riskLevel.toLowerCase()}`;
      levelEl.textContent = prediction.riskLevel + ' Risk';
      
      // Display reasons
      reasonsEl.innerHTML = '';
      if (prediction.reasons.length > 0) {
        prediction.reasons.forEach(reason => {
          const item = document.createElement('div');
          item.className = 'gophishfree-reason-item';
          item.textContent = reason;
          reasonsEl.appendChild(item);
        });
      } else {
        reasonsEl.innerHTML = '<div class="gophishfree-reason-item">No significant risk indicators detected</div>';
      }
      
      // Display suspicious links
      linksEl.innerHTML = '';
      const suspiciousLinks = emailData.links.filter(link => {
        const linkFeatures = extractor.extractURLFeatures(link.href);
        return linkFeatures.SuspiciousTLD || linkFeatures.ShortenerDomain || 
               linkFeatures.IpAddress || linkFeatures.NoHttps;
      });
      
      if (suspiciousLinks.length > 0) {
        suspiciousLinks.forEach(link => {
          const item = document.createElement('div');
          item.className = 'gophishfree-link-item suspicious';
          const anchor = document.createElement('a');
          anchor.href = link.href;
          anchor.target = '_blank';
          anchor.className = 'gophishfree-link-url';
          anchor.textContent = link.href.length > 60 ? link.href.substring(0, 60) + '...' : link.href;
          item.appendChild(anchor);
          if (link.anchorText && link.anchorText !== link.href) {
            const text = document.createElement('div');
            text.style.marginTop = '4px';
            text.style.fontSize = '11px';
            text.style.color = '#666';
            text.textContent = `Text: ${link.anchorText}`;
            item.appendChild(text);
          }
          linksEl.appendChild(item);
        });
      } else {
      linksEl.innerHTML = '<div class="gophishfree-link-item">No suspicious links detected</div>';
    }
  }
  
  /**
   * Update risk badge in email header
   */
  function updateRiskBadge(riskLevel, riskScore) {
      // Remove existing badge
      const existingBadge = document.getElementById('gophishfree-badge');
      if (existingBadge) {
        existingBadge.remove();
      }
      
      // Find email header area
      const headerArea = document.querySelector('[role="main"] h2') ||
                        document.querySelector('.hP') ||
                        document.querySelector('h2');
      
      if (headerArea) {
        const badge = document.createElement('div');
        badge.id = 'gophishfree-badge';
        badge.className = `gophishfree-risk-badge ${riskLevel.toLowerCase()}`;
        badge.textContent = `${riskLevel} Risk (${riskScore})`;
        badge.title = 'Click to view detailed analysis';
        badge.addEventListener('click', () => openSidePanel());
        
        // Insert badge
      headerArea.parentElement.insertBefore(badge, headerArea.nextSibling);
    }
  }
  
  /**
   * Open side panel
   */
  function openSidePanel() {
      document.getElementById('gophishfree-sidepanel').classList.add('open');
    document.getElementById('gophishfree-overlay').classList.add('show');
  }
  
  /**
   * Close side panel
   */
  function closeSidePanel() {
      document.getElementById('gophishfree-sidepanel').classList.remove('open');
    document.getElementById('gophishfree-overlay').classList.remove('show');
  }
  
})();
