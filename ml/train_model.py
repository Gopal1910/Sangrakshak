import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import joblib

# Generate synthetic training data (replace with real data)
def generate_synthetic_data(n_samples=10000):
    np.random.seed(42)
    
    # Human-like behavior
    human_data = []
    for _ in range(n_samples // 2):
        human_data.append({
            'mouse_speed': np.random.uniform(100, 500),
            'mouse_path_complexity': np.random.uniform(0.3, 1.0),
            'mouse_movements_per_sec': np.random.uniform(0.5, 3),
            'typing_speed': np.random.uniform(100, 300),
            'typing_rhythm': np.random.uniform(0.3, 0.8),
            'scroll_depth': np.random.uniform(30, 100),
            'scroll_pattern': np.random.choice([0.5, 1.0]),
            'time_on_page': np.random.uniform(10, 300),
            'clicks_per_minute': np.random.uniform(1, 10),
            'tab_switches': np.random.randint(0, 3),
            'has_plugins': 1,
            'cookies_enabled': 1,
            'do_not_track': np.random.choice([0, 1]),
            'label': 0  # human
        })
    
    # Bot-like behavior
    bot_data = []
    for _ in range(n_samples // 2):
        bot_data.append({
            'mouse_speed': np.random.uniform(0, 50),
            'mouse_path_complexity': np.random.uniform(0, 0.1),
            'mouse_movements_per_sec': np.random.uniform(0, 0.1),
            'typing_speed': np.random.uniform(500, 1000),
            'typing_rhythm': np.random.uniform(0, 0.1),
            'scroll_depth': np.random.uniform(0, 10),
            'scroll_pattern': np.random.choice([0.2, 0.5]),
            'time_on_page': np.random.uniform(0, 5),
            'clicks_per_minute': np.random.uniform(0, 1),
            'tab_switches': np.random.randint(0, 1),
            'has_plugins': np.random.choice([0, 1]),
            'cookies_enabled': np.random.choice([0, 1]),
            'do_not_track': np.random.choice([0, 1]),
            'label': 1  # bot
        })
    
    return pd.DataFrame(human_data + bot_data)

# Load or generate data
print("Generating training data...")
data = generate_synthetic_data(20000)

# Prepare features and labels
feature_cols = [col for col in data.columns if col != 'label']
X = data[feature_cols]
y = data['label']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Build model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', input_shape=(len(feature_cols),)),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(16, activation='relu'),
    tf.keras.layers.Dense(1, activation='sigmoid')
])

model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy', tf.keras.metrics.Precision(), tf.keras.metrics.Recall()]
)

# Train
print("Training model...")
history = model.fit(
    X_train, y_train,
    epochs=20,
    batch_size=32,
    validation_data=(X_test, y_test),
    verbose=1
)

# Evaluate
test_loss, test_acc, test_precision, test_recall = model.evaluate(X_test, y_test)
print(f"\nTest Accuracy: {test_acc:.4f}")
print(f"Test Precision: {test_precision:.4f}")
print(f"Test Recall: {test_recall:.4f}")

# Save model for TensorFlow.js
model.save('bot_detection_model')

# Convert to TensorFlow.js format
!tensorflowjs_converter --input_format=keras bot_detection_model tfjs_model

print("\n✅ Model saved for TensorFlow.js")