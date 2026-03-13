import http.server
import socketserver
import webbrowser
import os
import threading
import time

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def log_message(self, format, *args):
        pass  # Silence logs

print("="*60)
print("🌐 SANGRAKSHAK AI - TEST WEBSITE")
print("="*60)
print(f"📍 Test Website URL: http://localhost:{PORT}/test_website.html")
print(f"🆔 Website ID: sang_ohs1e5aa7sb_1771348082619")
print("="*60)
print("📊 DASHBOARD: http://localhost:8080/dashboard")
print("   (Login with testuser@example.com)")
print("="*60)
print("🚀 Starting test website server...")

# Open browser automatically
webbrowser.open(f"http://localhost:{PORT}/test_website.html")

# Start server
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"✅ Test website running at http://localhost:{PORT}")
    print("="*60)
    print("Commands to run in other terminals:")
    print("📌 Terminal 2: npm run dev  (Dashboard)")
    print("📌 Terminal 3: python tools/demo_attack.py  (Attack)")
    print("="*60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Test website stopped")