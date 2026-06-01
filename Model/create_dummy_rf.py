import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

print("Loading features...")
with open('features.json', 'r') as f:
    features = json.load(f)

print("Generating synthetic data for Random Forest baseline...")
# Generate 2000 synthetic rows
n_samples = 2000
np.random.seed(42)

data = {}
for feat in features:
    if feat == 'discount_percentage':
        data[feat] = np.random.uniform(0, 0.8, n_samples)
    elif feat == 'days_until_expiry':
        data[feat] = np.random.randint(1, 30, n_samples)
    elif feat == 'inventory_on_hand':
        data[feat] = np.random.randint(10, 500, n_samples)
    elif feat == 'full_price':
        data[feat] = np.random.uniform(2.0, 50.0, n_samples)
    elif feat == 'product_popularity':
        data[feat] = np.random.uniform(0.1, 1.0, n_samples)
    else:
        # Just random floats for the rest
        data[feat] = np.random.uniform(0, 1, n_samples)

X = pd.DataFrame(data)[features] # ensure order

# Create a synthetic target 'Sales' that roughly correlates to discount and popularity, but is noisy
# We want this model to be less accurate than the XGBoost model.
y = (
    X['inventory_on_hand'] * 0.2 + 
    X['discount_percentage'] * 100 + 
    (30 - X['days_until_expiry']) * 2 + 
    np.random.normal(0, 20, n_samples) # add noise to make it less accurate
)
y = np.clip(y, 0, None) # sales can't be negative

print("Training RandomForestRegressor...")
rf_model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
rf_model.fit(X, y)

print("Saving rf_model.joblib...")
joblib.dump(rf_model, 'rf_model.joblib')
print("Done! Random Forest baseline created.")
