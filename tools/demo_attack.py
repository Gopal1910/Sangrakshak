import requests
import random
import time
import json
import datetime  # 👈 Add this import
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

class BotSimulator:
    def __init__(self, target_url, website_id):
        self.target_url = target_url
        self.website_id = website_id
        self.session = requests.Session()
        # 👇 Cloudflare Worker URL
        self.worker_url = "https://sangrakshak-worker.sangrakshak-ai.workers.dev"
        
    def simulate_scraper_bot(self):
        """Simulate a web scraper bot"""
        print(f"🤖 Simulating scraper bot for website {self.website_id}")
        
        # Bot-like behavior data
        behavior = {
            "mouseMovements": 0,
            "mousePath": [],
            "typingSpeed": 500,
            "scrollDepth": 0,
            "scrollPattern": "none",
            "timeOnPage": 0.5,
            "clicks": 0,
            "tabSwitches": 0,
            "screenSize": "1920x1080",
            "userAgent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "language": "en-US",
            "plugins": 0,
            "cookiesEnabled": True,
            "doNotTrack": None,
            "timezone": "America/New_York"
        }
        
        payload = {
            "sessionId": f"bot_session_{random.randint(1000, 9999)}",
            "websiteId": self.website_id,
            "behavior": behavior,
            "url": "https://example.com/page",
            "referrer": "https://google.com",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"  # 👈 Fixed
        }
        
        for i in range(5):
            try:
                response = self.session.post(
                    f"{self.worker_url}/analyze",
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                )
                print(f"   Request {i+1}: Status {response.status_code}")
                if response.status_code == 200:
                    result = response.json()
                    print(f"   Result: Block={result.get('block')}, Confidence={result.get('confidence')}")
            except Exception as e:
                print(f"   Error: {e}")
            time.sleep(0.5)
        
    def simulate_credential_stuffing(self):
        """Simulate login attempts"""
        print(f"🔐 Simulating credential stuffing for website {self.website_id}")
        
        behavior = {
            "mouseMovements": 2,
            "mousePath": [{"x": 100, "y": 200, "t": time.time() * 1000}],
            "typingSpeed": 300,
            "scrollDepth": 5,
            "scrollPattern": "shallow",
            "timeOnPage": 2.0,
            "clicks": 1,
            "tabSwitches": 0,
            "screenSize": "1920x1080",
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "language": "en-US",
            "plugins": 5,
            "cookiesEnabled": True,
            "doNotTrack": None,
            "timezone": "America/New_York"
        }
        
        payload = {
            "sessionId": f"credential_session_{random.randint(1000, 9999)}",
            "websiteId": self.website_id,
            "behavior": behavior,
            "url": "https://example.com/login",
            "referrer": "https://example.com",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"  # 👈 Fixed
        }
        
        for i in range(3):
            try:
                response = self.session.post(
                    f"{self.worker_url}/analyze",
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                )
                print(f"   Attempt {i+1}: Status {response.status_code}")
                if response.status_code == 200:
                    result = response.json()
                    print(f"   Result: Block={result.get('block')}, Confidence={result.get('confidence')}")
            except Exception as e:
                print(f"   Error: {e}")
            time.sleep(0.5)
    
    def simulate_ddos(self):
        """Simulate DDoS attack pattern"""
        print(f"🌊 Simulating DDoS on website {self.website_id}")
        
        behavior = {
            "mouseMovements": 0,
            "mousePath": [],
            "typingSpeed": 0,
            "scrollDepth": 0,
            "scrollPattern": "none",
            "timeOnPage": 0.1,
            "clicks": 0,
            "tabSwitches": 0,
            "screenSize": "1024x768",
            "userAgent": "python-requests/2.32.5",
            "language": "en-US",
            "plugins": 0,
            "cookiesEnabled": False,
            "doNotTrack": "1",
            "timezone": "UTC"
        }
        
        payload = {
            "sessionId": f"ddos_session_{random.randint(1000, 9999)}",
            "websiteId": self.website_id,
            "behavior": behavior,
            "url": "https://example.com/api/endpoint",
            "referrer": "",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"  # 👈 Fixed
        }
        
        for i in range(5):
            try:
                response = self.session.post(
                    f"{self.worker_url}/analyze",
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                )
                print(f"   Request {i+1}: Status {response.status_code}")
                if response.status_code == 200:
                    result = response.json()
                    print(f"   Result: Block={result.get('block')}, Confidence={result.get('confidence')}")
            except Exception as e:
                print(f"   Error: {e}")
            time.sleep(0.1)  # Very fast
    
    def simulate_headless_browser(self):
        """Simulate headless browser"""
        print(f"🕷️ Simulating headless browser for website {self.website_id}")
        
        behavior = {
            "mouseMovements": 10,
            "mousePath": [{"x": i*10, "y": i*5, "t": time.time() * 1000 + i*100} for i in range(5)],
            "typingSpeed": 200,
            "scrollDepth": 25,
            "scrollPattern": "medium",
            "timeOnPage": 5.0,
            "clicks": 2,
            "tabSwitches": 1,
            "screenSize": "1920x1080",
            "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
            "language": "en-US",
            "plugins": 3,
            "cookiesEnabled": True,
            "doNotTrack": None,
            "timezone": "America/Los_Angeles"
        }
        
        payload = {
            "sessionId": f"headless_session_{random.randint(1000, 9999)}",
            "websiteId": self.website_id,
            "behavior": behavior,
            "url": "https://example.com/dashboard",
            "referrer": "https://google.com",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"  # 👈 Fixed
        }
        
        try:
            response = self.session.post(
                f"{self.worker_url}/analyze",
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            print(f"   Headless browser simulation: Status {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"   Result: Block={result.get('block')}, Confidence={result.get('confidence')}")
        except Exception as e:
            print(f"   Error: {e}")
    
    def run_all_attacks(self):
        """Run all attack simulations"""
        print("="*50)
        print("🚨 Starting Bot Attack Simulation")
        print("="*50)
        print(f"📡 Worker URL: {self.worker_url}")
        print(f"🆔 Website ID: {self.website_id}")
        print("="*50)
        
        self.simulate_scraper_bot()
        time.sleep(2)
        
        self.simulate_credential_stuffing()
        time.sleep(2)
        
        self.simulate_ddos()
        time.sleep(2)
        
        self.simulate_headless_browser()
        
        print("="*50)
        print("✅ Attack simulation complete")
        print("📊 Check your Firebase Dashboard")
        print("="*50)

if __name__ == "__main__":
    # 👇 REAL WEBSITE ID - Jo tumne dashboard mein add ki hai
    WEBSITE_ID = "sang_ohs1e5aa7sb_1771348082619"  # Tumhari actual website ID
    
    bot = BotSimulator(None, WEBSITE_ID)
    bot.run_all_attacks()