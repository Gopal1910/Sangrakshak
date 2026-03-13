(function() {
  // Sangrakshak AI Protection Script
  window._sangrakshak = window._sangrakshak || {
    websiteId: null,
    sessionId: generateSessionId(),
    events: [],
    startTime: Date.now()
  };

  // Generate unique session ID
  function generateSessionId() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () => 
      Math.floor(Math.random() * 16).toString(16)
    );
  }

  // Collect behavioral data
  const behaviorData = {
    mouseMovements: 0,
    mousePath: [],
    keyStrokes: [],
    scrollDepth: 0,
    scrollPattern: 'none',
    timeOnPage: 0,
    clicks: 0,
    typingSpeed: 0,
    tabSwitches: 0,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    language: navigator.language,
    plugins: navigator.plugins.length,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  // Track mouse movements
  let mouseEvents = 0;
  let mousePath = [];
  document.addEventListener('mousemove', (e) => {
    mouseEvents++;
    // Sample every 10th movement
    if (mouseEvents % 10 === 0) {
      mousePath.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    }
    behaviorData.mouseMovements = mouseEvents;
    behaviorData.mousePath = mousePath.slice(-20); // Last 20 points
  });

  // Track typing patterns
  let keyPressTimes = [];
  document.addEventListener('keydown', (e) => {
    const now = Date.now();
    keyPressTimes.push(now);
    
    // Calculate typing speed (keys per minute)
    if (keyPressTimes.length > 1) {
      const timeDiff = (now - keyPressTimes[0]) / 60000; // in minutes
      behaviorData.typingSpeed = Math.round(keyPressTimes.length / timeDiff);
    }
  });

  // Track scroll behavior
  let maxScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    maxScroll = Math.max(maxScroll, scrollPercent);
    behaviorData.scrollDepth = Math.round(maxScroll);
    behaviorData.scrollPattern = scrollPercent > 80 ? 'deep' : scrollPercent > 30 ? 'medium' : 'shallow';
  });

  // Track clicks
  document.addEventListener('click', (e) => {
    behaviorData.clicks++;
    behaviorData.lastClick = {
      x: e.clientX,
      y: e.clientY,
      target: e.target.tagName
    };
  });

  // Track page visibility
  let tabSwitches = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      tabSwitches++;
      behaviorData.tabSwitches = tabSwitches;
    }
  });

  // Show challenge function (for suspicious behavior)
  function showChallenge() {
    // Simple checkbox challenge
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: sans-serif;
    `;
    
    overlay.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
        <h2>🤖 Are you human?</h2>
        <p>Please check the box to continue</p>
        <input type="checkbox" id="human-check">
        <label for="human-check">I am human</label>
        <br><br>
        <button id="verify-btn" style="padding: 10px 20px; background: #0066ff; color: white; border: none; border-radius: 5px; cursor: pointer;">Verify</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('verify-btn').onclick = () => {
      if (document.getElementById('human-check').checked) {
        overlay.remove();
        // Send verification to server
        fetch('https://sangrakshak-worker.sangrakshak-ai.workers.dev/verify', {
          method: 'POST',
          body: JSON.stringify({ sessionId: window._sangrakshak.sessionId, verified: true })
        });
      }
    };
  }

  // Send data for analysis periodically
  setInterval(async () => {
    behaviorData.timeOnPage = Math.round((Date.now() - window._sangrakshak.startTime) / 1000);
    
    // Get website ID from script tag
    const scriptTag = document.querySelector('script[data-site-id]');
    const websiteId = scriptTag?.getAttribute('data-site-id');
    
    if (!websiteId) {
      console.warn('Sangrakshak AI: No website ID found');
      return;
    }

    try {
      // 👇 YOUR CLOUDFLARE WORKER URL
      const response = await fetch('https://sangrakshak-worker.sangrakshak-ai.workers.dev/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-ID': websiteId
        },
        body: JSON.stringify({
          sessionId: window._sangrakshak.sessionId,
          websiteId: websiteId,
          behavior: behaviorData,
          url: window.location.href,
          referrer: document.referrer,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (result.block) {
        console.log('Sangrakshak AI: Bot detected, confidence:', result.confidence);
        
        // Block bot - show warning or redirect
        if (result.confidence > 90) {
          document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; font-family: sans-serif; background: #f8f9fa; min-height: 100vh;">
              <div style="max-width: 500px; margin: 100px auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1 style="color: #dc3545;">🚫 Access Denied</h1>
                <p style="color: #666; margin: 20px 0;">Bot activity detected. If you're human, please enable JavaScript and try again.</p>
                <p style="font-size: 12px; color: #999;">Reference: ${result.reference || window._sangrakshak.sessionId}</p>
              </div>
            </div>
          `;
        } else if (result.confidence > 60) {
          // Show challenge for medium confidence
          showChallenge();
        }
      }
    } catch (error) {
      console.error('Sangrakshak AI: Analysis failed', error);
    }
  }, 5000); // Every 5 seconds

  // Also send data on page unload
  window.addEventListener('beforeunload', () => {
    behaviorData.timeOnPage = Math.round((Date.now() - window._sangrakshak.startTime) / 1000);
    
    navigator.sendBeacon('https://sangrakshak-worker.sangrakshak-ai.workers.dev/analyze', 
      JSON.stringify({
        sessionId: window._sangrakshak.sessionId,
        websiteId: document.querySelector('script[data-site-id]')?.getAttribute('data-site-id'),
        behavior: behaviorData,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    );
  });

  console.log('✅ Sangrakshak AI Protection Active');
})();