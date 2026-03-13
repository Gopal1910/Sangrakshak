const functions = require('firebase-functions');
const admin = require('firebase-admin');
const tf = require('@tensorflow/tfjs-node');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Load ML model
let model;
async function loadModel() {
  try {
    model = await tf.loadLayersModel('file://./models/bot-detection/model.json');
    console.log('✅ ML Model loaded');
  } catch (error) {
    console.error('❌ Model loading failed:', error);
  }
}
loadModel();

// Feature extraction function
function extractFeatures(behavior) {
  return {
    // Mouse behavior features
    mouseSpeed: calculateMouseSpeed(behavior.mousePath),
    mousePathComplexity: calculatePathComplexity(behavior.mousePath),
    mouseMovementsPerSecond: behavior.mouseMovements / behavior.timeOnPage,
    
    // Keyboard features
    typingSpeed: behavior.typingSpeed || 0,
    typingRhythm: calculateTypingRhythm(behavior.keyPressTimes),
    
    // Scroll features
    scrollDepth: behavior.scrollDepth || 0,
    scrollPattern: behavior.scrollPattern === 'deep' ? 1 : 
                   behavior.scrollPattern === 'medium' ? 0.5 : 0.2,
    
    // Page interaction features
    timeOnPage: behavior.timeOnPage,
    clicksPerMinute: (behavior.clicks || 0) / (behavior.timeOnPage / 60),
    tabSwitches: behavior.tabSwitches || 0,
    
    // Browser features
    hasPlugins: behavior.plugins > 0 ? 1 : 0,
    cookiesEnabled: behavior.cookiesEnabled ? 1 : 0,
    doNotTrack: behavior.doNotTrack ? 1 : 0
  };
}

// Rule-based detection (fallback if ML model not available)
function ruleBasedDetection(features) {
  let botScore = 0;
  let reasons = [];

  // No mouse movement? Likely bot
  if (features.mouseMovementsPerSecond < 0.1) {
    botScore += 30;
    reasons.push('No mouse movement');
  }

  // Super fast typing? Bot
  if (features.typingSpeed > 300) {
    botScore += 25;
    reasons.push('Abnormal typing speed');
  }

  // No scrolling? Suspicious
  if (features.scrollDepth < 5) {
    botScore += 20;
    reasons.push('No scrolling');
  }

  // Too fast page interaction
  if (features.timeOnPage < 2 && features.clicksPerMinute > 30) {
    botScore += 25;
    reasons.push('Too fast interaction');
  }

  // Headless browser detection
  if (!features.hasPlugins) {
    botScore += 15;
    reasons.push('Headless browser detected');
  }

  return {
    score: botScore,
    isBot: botScore > 50,
    reasons
  };
}

// ML-based detection
async function mlBasedDetection(features) {
  if (!model) return null;

  try {
    // Convert features to tensor
    const inputTensor = tf.tensor2d([Object.values(features)]);
    const prediction = model.predict(inputTensor);
    const score = prediction.dataSync()[0] * 100;
    
    return {
      score: score,
      isBot: score > 70,
      confidence: score
    };
  } catch (error) {
    console.error('ML prediction failed:', error);
    return null;
  }
}

// Main analysis endpoint
exports.analyzeTraffic = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { websiteId, sessionId, behavior, url, referrer } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      // Extract features
      const features = extractFeatures(behavior);
      
      // Try ML detection first
      let mlResult = await mlBasedDetection(features);
      let ruleResult = ruleBasedDetection(features);
      
      // Combine results (ML has higher weight if available)
      let finalResult;
      if (mlResult) {
        finalResult = {
          score: Math.round((mlResult.score * 0.7 + ruleResult.score * 0.3)),
          isBot: mlResult.isBot || ruleResult.isBot,
          confidence: mlResult.confidence,
          method: 'ml+rule'
        };
      } else {
        finalResult = {
          score: ruleResult.score,
          isBot: ruleResult.isBot,
          confidence: ruleResult.score,
          method: 'rule-only'
        };
      }
      
      // Get country from IP
      const country = await getCountryFromIP(ip);
      
      // Determine attack type
      const attackType = classifyAttack(behavior, url);
      
      // Store in Firestore
      const attackData = {
        ip,
        country,
        type: attackType,
        score: finalResult.score,
        confidence: finalResult.confidence,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: finalResult.isBot ? 'Blocked' : 'Allowed',
        path: url,
        referrer,
        userAgent: behavior.userAgent,
        sessionId,
        websiteId,
        features,
        method: finalResult.method
      };
      
      // Find user by websiteId
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('websites', 'array-contains', websiteId)
        .get();
      
      if (!usersSnapshot.empty) {
        const userId = usersSnapshot.docs[0].id;
        
        // Save to attacks collection
        await admin.firestore()
          .collection('users')
          .doc(userId)
          .collection('websites')
          .doc(websiteId)
          .collection('attacks')
          .add(attackData);
        
        // Also save to traffic collection for real-time dashboard
        await admin.firestore()
          .collection('users')
          .doc(userId)
          .collection('traffic')
          .add({
            ...attackData,
            type: finalResult.isBot ? 'bot' : 'human'
          });
        
        // If high confidence bot, send alert
        if (finalResult.isBot && finalResult.confidence > 85) {
          await sendAlert(userId, websiteId, attackData);
        }
      }
      
      // Return decision to client
      res.json({
        block: finalResult.isBot && finalResult.confidence > 70,
        confidence: finalResult.confidence,
        score: finalResult.score,
        reference: `${Date.now()}-${sessionId}`,
        challenge: finalResult.confidence > 50 && finalResult.confidence < 70
      });
      
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ error: 'Analysis failed' });
    }
  });
});

// Helper functions
async function getCountryFromIP(ip) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    return data.countryCode || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function classifyAttack(behavior, url) {
  const { requestCount, path } = behavior;
  
  if (url?.includes('wp-login') || url?.includes('admin')) {
    return 'Credential Stuffing';
  } else if (requestCount > 100) {
    return 'DDoS Attempt';
  } else if (url?.includes('api')) {
    return 'API Abuse';
  } else if (behavior.scrollDepth < 5 && behavior.mouseMovements < 10) {
    return 'Web Scraping';
  } else {
    return 'Suspicious Bot';
  }
}

async function sendAlert(userId, websiteId, attackData) {
  // Get user email
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const userEmail = userDoc.data()?.email;
  
  if (userEmail) {
    // Send email alert
    // You can use SendGrid, AWS SES, etc.
    console.log(`Alert sent to ${userEmail} for attack on ${websiteId}`);
  }
}

// ML Model Training Endpoint (Admin only)
exports.trainModel = functions.https.onRequest(async (req, res) => {
  // Verify admin
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer admin-secret-key') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    // Fetch labeled data from Firestore
    const attacksSnapshot = await admin.firestore()
      .collectionGroup('attacks')
      .where('label', 'in', ['human', 'bot'])
      .limit(1000)
      .get();
    
    const trainingData = [];
    const labels = [];
    
    attacksSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.features) {
        trainingData.push(Object.values(data.features));
        labels.push(data.label === 'bot' ? 1 : 0);
      }
    });
    
    // Train model (simplified - use TensorFlow.js)
    // This would be a separate process
    
    res.json({ 
      success: true, 
      samples: trainingData.length,
      message: 'Model training started'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});