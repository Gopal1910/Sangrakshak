// Simplified Worker with better Firebase integration
export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      
      if (url.pathname === '/analyze') {
        const data = await request.json();
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        
        // Bot detection
        const result = detectBot(data.behavior);
        
        // Save to Firebase
        const saveResult = await saveToFirebase(data, result, clientIP);
        
        return new Response(JSON.stringify({
          success: true,
          block: result.isBot,
          confidence: result.confidence,
          saved: saveResult
        }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      return new Response('Not found', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

function detectBot(behavior) {
  let score = 0;
  
  if (behavior.mouseMovements < 5) score += 30;
  if (behavior.typingSpeed > 300) score += 25;
  if (behavior.scrollDepth < 10) score += 20;
  if (behavior.timeOnPage < 2 && behavior.clicks > 0) score += 25;
  
  return {
    isBot: score > 60,
    confidence: score
  };
}

async function saveToFirebase(data, result, ip) {
  try {
    // Get website ID from request
    const websiteId = data.websiteId || 'unknown';
    
    // Firebase REST API URL
    const baseUrl = `https://firestore.googleapis.com/v1/projects/sangrakshak-ai/databases/(default)/documents`;
    
    // Save to attacks collection
    const attackData = {
      fields: {
        ip: { stringValue: ip },
        type: { stringValue: result.isBot ? 'bot' : 'human' },
        confidence: { integerValue: result.confidence },
        status: { stringValue: result.isBot ? 'Blocked' : 'Allowed' },
        timestamp: { timestampValue: new Date().toISOString() },
        websiteId: { stringValue: websiteId },
        userAgent: { stringValue: data.behavior?.userAgent || 'unknown' },
        path: { stringValue: data.url || '/' }
      }
    };
    
    // Save to main attacks collection
    const response = await fetch(`${baseUrl}/attacks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attackData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Firebase error:', error);
      return false;
    }
    
    // Also save to website-specific collection
    if (websiteId !== 'unknown') {
      await fetch(`${baseUrl}/users/${websiteId}/attacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attackData)
      }).catch(e => console.log('Website collection save failed:', e));
    }
    
    return true;
  } catch (error) {
    console.error('Save error:', error);
    return false;
  }
}