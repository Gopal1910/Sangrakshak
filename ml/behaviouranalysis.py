#!/usr/bin/env python3
"""
Sangrakshak AI - Behavior Analysis ML Model
Analyzes user behavior patterns to detect bots
"""

import json
import sys
import os
import numpy as np
from collections import defaultdict
import pickle
import socket
import threading

# Try to import sklearn, fallback to rule-based if not available
try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Warning: sklearn not available, using rule-based detection")

class BehaviorAnalyzer:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        self.load_model()
        
    def load_model(self):
        """Load pre-trained model if available"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    data = pickle.load(f)
                    self.model = data.get('model')
                    self.scaler = data.get('scaler')
                print("Model loaded successfully")
            except Exception as e:
                print(f"Error loading model: {e}")
                self.model = None
                self.scaler = None
    
    def extract_features(self, behavior_data):
        """Extract features from behavior data"""
        features = {}
        
        # Mouse movement features
        mouse_movements = behavior_data.get('mouseMovements', [])
        if len(mouse_movements) > 1:
            velocities = []
            angles = []
            accelerations = []
            
            for i in range(1, len(mouse_movements)):
                dx = mouse_movements[i].get('x', 0) - mouse_movements[i-1].get('x', 0)
                dy = mouse_movements[i].get('y', 0) - mouse_movements[i-1].get('y', 0)
                dt = (mouse_movements[i].get('timestamp', 0) - mouse_movements[i-1].get('timestamp', 0)) / 1000
                
                if dt > 0:
                    velocity = np.sqrt(dx**2 + dy**2) / dt
                    velocities.append(velocity)
                    
                    if i > 1:
                        prev_dx = mouse_movements[i-1].get('x', 0) - mouse_movements[i-2].get('x', 0)
                        prev_dy = mouse_movements[i-1].get('y', 0) - mouse_movements[i-2].get('y', 0)
                        if dt > 0:
                            angle = np.arctan2(dy, dx) - np.arctan2(prev_dy, prev_dx)
                            angles.append(angle)
                            
                            if len(velocities) > 1:
                                acc = velocities[-1] - velocities[-2]
                                accelerations.append(acc)
            
            if velocities:
                features['avg_velocity'] = np.mean(velocities)
                features['velocity_std'] = np.std(velocities)
                features['velocity_max'] = np.max(velocities)
                features['velocity_min'] = np.min(velocities)
            else:
                features['avg_velocity'] = 0
                features['velocity_std'] = 0
                features['velocity_max'] = 0
                features['velocity_min'] = 0
                
            if angles:
                features['angle_std'] = np.std(angles)
                features['angle_changes'] = np.sum(np.abs(np.diff(angles)) > 0.5)
            else:
                features['angle_std'] = 0
                features['angle_changes'] = 0
                
            if accelerations:
                features['acceleration_std'] = np.std(accelerations)
            else:
                features['acceleration_std'] = 0
                
            # Check for perfect linearity (bot indicator)
            if len(mouse_movements) > 10:
                x_coords = [m.get('x', 0) for m in mouse_movements]
                y_coords = [m.get('y', 0) for m in mouse_movements]
                
                # Calculate linearity
                if len(set(x_coords)) > 1 and len(set(y_coords)) > 1:
                    x_range = max(x_coords) - min(x_coords)
                    y_range = max(y_coords) - min(y_coords)
                    
                    if x_range > 0 and y_range > 0:
                        aspect_ratio = min(x_range, y_range) / max(x_range, y_range)
                        features['path_linearity'] = aspect_ratio
                    else:
                        features['path_linearity'] = 0
                else:
                    features['path_linearity'] = 0
            else:
                features['path_linearity'] = 0
        else:
            features['avg_velocity'] = 0
            features['velocity_std'] = 0
            features['velocity_max'] = 0
            features['velocity_min'] = 0
            features['angle_std'] = 0
            features['angle_changes'] = 0
            features['acceleration_std'] = 0
            features['path_linearity'] = 0
        
        # Typing rhythm features
        typing_data = behavior_data.get('typingSpeed', [])
        if typing_data:
            intervals = [t.get('timeBetween', 0) for t in typing_data]
            features['avg_typing_interval'] = np.mean(intervals)
            features['typing_std'] = np.std(intervals)
            features['typing_min'] = np.min(intervals)
            features['typing_max'] = np.max(intervals)
            features['typing_range'] = np.max(intervals) - np.min(intervals)
            
            # Check for too consistent typing (bot indicator)
            if np.std(intervals) < 5 and len(intervals) > 3:
                features['typing_too_consistent'] = 1
            else:
                features['typing_too_consistent'] = 0
        else:
            features['avg_typing_interval'] = 0
            features['typing_std'] = 0
            features['typing_min'] = 0
            features['typing_max'] = 0
            features['typing_range'] = 0
            features['typing_too_consistent'] = 0
        
        # Scroll behavior features
        scroll_events = behavior_data.get('scrollEvents', [])
        if len(scroll_events) > 1:
            positions = [s.get('position', 0) for s in scroll_events]
            velocities = []
            for i in range(1, len(scroll_events)):
                dt = (scroll_events[i].get('timestamp', 0) - scroll_events[i-1].get('timestamp', 0)) / 1000
                if dt > 0:
                    vel = abs(positions[i] - positions[i-1]) / dt
                    velocities.append(vel)
            
            if velocities:
                features['avg_scroll_velocity'] = np.mean(velocities)
                features['scroll_velocity_std'] = np.std(velocities)
            else:
                features['avg_scroll_velocity'] = 0
                features['scroll_velocity_std'] = 0
                
            # Check for uniform scrolling (bot indicator)
            if len(positions) > 3:
                features['scroll_uniformity'] = 1 if np.std(positions) < 50 else 0
            else:
                features['scroll_uniformity'] = 0
        else:
            features['avg_scroll_velocity'] = 0
            features['scroll_velocity_std'] = 0
            features['scroll_uniformity'] = 0
        
        # Click patterns
        click_events = behavior_data.get('clickEvents', [])
        features['click_count'] = len(click_events)
        
        # Time-based features
        features['time_on_page'] = behavior_data.get('timeOnPage', 0)
        features['request_frequency'] = behavior_data.get('requestFrequency', 0)
        
        # Mouse presence (bot indicator - no mouse movement)
        features['has_mouse_movement'] = 1 if len(mouse_movements) > 0 else 0
        features['mouse_movement_count'] = len(mouse_movements)
        
        # Check for headless browser indicators
        user_agent = behavior_data.get('userAgent', '').lower()
        features['is_headless'] = 1 if 'headless' in user_agent or 'puppeteer' in user_agent or 'selenium' in user_agent else 0
        
        return features
    
    def predict(self, behavior_data):
        """Predict if the behavior is from a bot"""
        features = self.extract_features(behavior_data)
        
        # Use ML model if available
        if SKLEARN_AVAILABLE and self.model and self.scaler:
            try:
                feature_vector = np.array([[
                    features.get('avg_velocity', 0),
                    features.get('velocity_std', 0),
                    features.get('angle_std', 0),
                    features.get('acceleration_std', 0),
                    features.get('typing_std', 0),
                    features.get('avg_scroll_velocity', 0),
                    features.get('click_count', 0),
                    features.get('time_on_page', 0),
                    features.get('has_mouse_movement', 0),
                    features.get('is_headless', 0)
                ]])
                
                scaled_features = self.scaler.transform(feature_vector)
                prediction = self.model.predict(scaled_features)[0]
                probability = self.model.predict_proba(scaled_features)[0]
                
                is_bot = bool(prediction)
                confidence = float(max(probability))
                
                reasons = []
                if is_bot:
                    if features.get('is_headless', 0) == 1:
                        reasons.append('Headless browser detected')
                    if features.get('path_linearity', 0) > 0.9:
                        reasons.append('Unnaturally linear mouse path')
                    if features.get('typing_too_consistent', 0) == 1:
                        reasons.append('Unnatural typing consistency')
                    if features.get('has_mouse_movement', 0) == 0 and features.get('request_frequency', 0) > 10:
                        reasons.append('No mouse movement with high request frequency')
                
                return {
                    'is_bot': is_bot,
                    'confidence': confidence,
                    'bot_type': 'scripted' if is_bot else 'human',
                    'reasons': reasons,
                    'features': features
                }
            except Exception as e:
                print(f"ML prediction error: {e}")
        
        # Fallback to rule-based detection
        return self.rule_based_detection(behavior_data, features)
    
    def rule_based_detection(self, behavior_data, features):
        """Rule-based bot detection"""
        bot_score = 0
        reasons = []
        bot_type = 'unknown'
        
        # Check for headless browser
        if features.get('is_headless', 0) == 1:
            bot_score += 0.8
            reasons.append('Headless browser detected')
            bot_type = 'headless'
        
        # Check for unnaturally smooth mouse movements
        if features.get('velocity_std', 0) < 50 and features.get('mouse_movement_count', 0) > 20:
            bot_score += 0.3
            reasons.append('Unnaturally consistent mouse velocity')
        
        # Check for linear path
        if features.get('path_linearity', 0) > 0.85:
            bot_score += 0.4
            reasons.append('Linear mouse movement pattern')
            bot_type = 'scripted'
        
        # Check for unnatural typing
        if features.get('typing_too_consistent', 0) == 1:
            bot_score += 0.3
            reasons.append('Unnatural typing rhythm')
            bot_type = 'scripted'
        
        # Check for no mouse movement but high requests
        if features.get('has_mouse_movement', 0) == 0 and features.get('request_frequency', 0) > 10:
            bot_score += 0.3
            reasons.append('High request frequency without mouse movement')
            bot_type = 'scraper'
        
        # Check for uniform scrolling
        if features.get('scroll_uniformity', 0) == 1 and features.get('mouse_movement_count', 0) < 5:
            bot_score += 0.2
            reasons.append('Uniform scrolling pattern')
        
        # Check for very low time on page with high requests
        if features.get('time_on_page', 0) < 1000 and features.get('request_frequency', 0) > 20:
            bot_score += 0.2
            reasons.append('Suspiciously quick page visits')
        
        is_bot = bot_score > 0.5
        confidence = min(bot_score, 0.95)
        
        return {
            'is_bot': is_bot,
            'confidence': confidence,
            'bot_type': bot_type,
            'reasons': reasons,
            'features': features
        }
    
    def train(self, training_data):
        """Train the model with labeled data"""
        if not SKLEARN_AVAILABLE:
            return {'success': False, 'error': 'sklearn not available'}
        
        try:
            X = []
            y = []
            
            for item in training_data:
                features = self.extract_features(item['behavior'])
                X.append([
                    features.get('avg_velocity', 0),
                    features.get('velocity_std', 0),
                    features.get('angle_std', 0),
                    features.get('acceleration_std', 0),
                    features.get('typing_std', 0),
                    features.get('avg_scroll_velocity', 0),
                    features.get('click_count', 0),
                    features.get('time_on_page', 0),
                    features.get('has_mouse_movement', 0),
                    features.get('is_headless', 0)
                ])
                y.append(1 if item['label'] == 'bot' else 0)
            
            X = np.array(X)
            y = np.array(y)
            
            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model
            self.model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.model.fit(X_scaled, y)
            
            # Save model
            with open(self.model_path, 'wb') as f:
                pickle.dump({'model': self.model, 'scaler': self.scaler}, f)
            
            return {'success': True, 'accuracy': self.model.score(X_scaled, y)}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


def handle_client(client_socket, analyzer):
    """Handle a client connection"""
    try:
        data = client_socket.recv(4096).decode('utf-8')
        if data:
            try:
                request = json.loads(data)
                
                if request.get('type') == 'predict':
                    behavior_data = request.get('data', {})
                    result = analyzer.predict(behavior_data)
                    client_socket.send(json.dumps(result).encode('utf-8'))
                elif request.get('type') == 'train':
                    training_data = request.get('data', [])
                    result = analyzer.train(training_data)
                    client_socket.send(json.dumps(result).encode('utf-8'))
                else:
                    client_socket.send(json.dumps({'error': 'Unknown request type'}).encode('utf-8'))
            except json.JSONDecodeError:
                client_socket.send(json.dumps({'error': 'Invalid JSON'}).encode('utf-8'))
    except Exception as e:
        print(f"Error handling client: {e}")
    finally:
        client_socket.close()


def start_server(port=5555):
    """Start the ML server"""
    analyzer = BehaviorAnalyzer()
    
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server.bind(('127.0.0.1', port))
        server.listen(5)
        print(f"ML Server listening on port {port}")
        
        while True:
            client, addr = server.accept()
            print(f"Connection from {addr}")
            client_thread = threading.Thread(target=handle_client, args=(client, analyzer))
            client_thread.daemon = True
            client_thread.start()
    except Exception as e:
        print(f"Server error: {e}")
    finally:
        server.close()


def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        if sys.argv[1] == '--serve':
            port = int(sys.argv[2]) if len(sys.argv) > 2 else 5555
            start_server(port)
        elif sys.argv[1] == '--train':
            # Train with provided data
            if len(sys.argv) > 2:
                training_data = json.loads(sys.argv[2])
                analyzer = BehaviorAnalyzer()
                result = analyzer.train(training_data)
                print(json.dumps(result))
            else:
                # Generate sample training data
                analyzer = BehaviorAnalyzer()
                training_data = []
                
                # Add human data samples
                for i in range(50):
                    training_data.append({
                        'behavior': {
                            'mouseMovements': [
                                {'x': 100 + i*10 + np.random.randint(-20, 20), 'y': 200 + np.random.randint(-30, 30), 'timestamp': i*100}
                                for i in range(20)
                            ],
                            'typingSpeed': [
                                {'timeBetween': 100 + np.random.randint(-50, 50)} for _ in range(10)
                            ],
                            'clickEvents': [{'x': np.random.randint(100, 800), 'y': np.random.randint(100, 600)} for _ in range(3)],
                            'scrollEvents': [{'position': i*100, 'timestamp': i*500} for i in range(5)],
                            'timeOnPage': 5000 + np.random.randint(-2000, 3000),
                            'requestFrequency': np.random.randint(1, 10)
                        },
                        'label': 'human'
                    })
                
                # Add bot data samples
                for i in range(50):
                    training_data.append({
                        'behavior': {
                            'mouseMovements': [
                                {'x': 100 + i*10, 'y': 200, 'timestamp': i*100}
                                for i in range(20)
                            ],
                            'typingSpeed': [
                                {'timeBetween': 100} for _ in range(10)
                            ],
                            'clickEvents': [],
                            'scrollEvents': [
                                {'position': i*100, 'timestamp': i*500} for i in range(5)
                            ],
                            'timeOnPage': 500,
                            'requestFrequency': 50,
                            'userAgent': 'HeadlessChrome'
                        },
                        'label': 'bot'
                    })
                
                result = analyzer.train(training_data)
                print(json.dumps(result))
        else:
            print("Usage: python behaviorAnalyzer.py [--serve [port]] [--train [data]]")
    else:
        # Interactive mode
        analyzer = BehaviorAnalyzer()
        print("Behavior Analyzer Ready")
        print("Enter behavior data (JSON) to analyze:")
        
        while True:
            try:
                line = input()
                if line:
                    data = json.loads(line)
                    result = analyzer.predict(data)
                    print(json.dumps(result))
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {e}")


if __name__ == '__main__':
    main()