import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import xgboost as xgb
from sklearn.preprocessing import OneHotEncoder
from scipy.optimize import minimize_scalar
import warnings
import re
import json
import joblib  
from flask import Flask, request, jsonify  
from flask_cors import CORS 

warnings.filterwarnings('ignore')

print("--- Loading all model assets... ---")
app = Flask(__name__)
CORS(app) 

try:
    demand_model = joblib.load('demand_model.joblib')
    encoder = joblib.load('category_encoder.joblib')
    with open('products_db.json', 'r') as f:
        products_db = json.load(f)
    with open('features.json', 'r') as f:
        features = json.load(f)
    with open('real_day_demand_factor.json', 'r') as f:
        real_day_demand_factor = json.load(f)
    with open('real_category_demand_factor.json', 'r') as f:
        real_category_demand_factor = json.load(f)
        
    # Convert string keys from JSON back to integers for day of week
    real_day_demand_factor = {int(k): v for k, v in real_day_demand_factor.items()}

    print("--- All 6 assets loaded successfully. Server is ready. ---")
except FileNotFoundError as e:
    print(f"--- !!! FILE NOT FOUND ERROR !!! ---")
    print(f"Could not find: {e.filename}")
    print("Please run the updated 'save_model.py' script from your notebook.")
    # In a real app, you would exit here
    
# ---
# ## 2. Logic: Paste Your Helper Functions
# ---
GLOBAL_MODEL_VERSION = '5.2.0'
GLOBAL_R2_SCORE = 0.98  

def get_price_sensitivity(days_left):
    if days_left <= 1: return 7.0
    elif days_left == 2: return 5.0
    elif days_left == 3: return 4.0
    elif days_left == 4: return 2
    else: return max(1 , 2 - days_left * 0.1)

def get_inventory_pressure(stock):
    pressure = 1.0 + (70 - stock) * 0.005
    return np.clip(pressure, 0.5, 1.5)

# ---
# ## 3. Logic: The "Solver" and "Prediction" Functions
# ---
def get_prediction_metrics(discount, product_id, inventory, days_left, base_features):
    discount = float(discount)
    urgency = get_price_sensitivity(days_left)
    pressure = get_inventory_pressure(inventory)
    
    model_input_dict = {
        'days_until_expiry': days_left, 'discount_percentage': discount,
        'inventory_on_hand': inventory, 'full_price': base_features['full_price'],
        'day_of_week': base_features['day_of_week'], 'is_weekend': base_features['is_weekend'],
        'urgency_factor': urgency, 'inventory_pressure': pressure,
        'product_popularity': base_features['popularity'],
        'discount_x_urgency': discount * urgency,
        'discount_x_inventory': discount * pressure,
        'discount_x_popularity': discount * base_features['popularity']
    }
    for i, name in enumerate(encoder.get_feature_names_out()):
        model_input_dict[name] = base_features['category_vector'][0][i]
    
    model_input = [model_input_dict[name] for name in features]
    model_input_np = np.array(model_input).reshape(1, -1)
    
    predicted_sales = float(demand_model.predict(model_input_np)[0])
    predicted_sales = max(0.0, min(float(inventory), predicted_sales))
    
    price = base_features['full_price'] * (1 - discount)
    revenue = price * predicted_sales
    cost = base_features['cost_price'] * predicted_sales
    profit = revenue - cost
    waste_units = inventory - predicted_sales
    waste_cost = waste_units * base_features['cost_price']
    
    return {
        "discountPercentage": float(discount * 100),
        "price": float(price),
        "expectedSales": float(predicted_sales),
        "expectedRevenue": float(revenue),
        "expectedWaste": float(waste_units),
        "expectedProfit": float(profit),
        "expectedLoss": float(waste_cost),
        "netProfit": float(profit - waste_cost)
    }

def find_optimal_pricing(product_id, inventory, days_left, current_discount=0.0):
    
    product_info = products_db.get(product_id)
    if not product_info: return {"error": "Product not found"}
    
    today = datetime.now()
    base_features = {
        "full_price": product_info['full_price'],
        "cost_price": product_info['cost_price'],
        "popularity": product_info['popularity'],
        "category_vector": encoder.transform([[product_info['category']]]),
        "day_of_week": today.weekday(),
        "is_weekend": int(today.weekday() >= 5)
    }

    # GOAL: Maximize NET Profit
    def objective_func_net_profit(discount):
        metrics = get_prediction_metrics(discount, product_id, inventory, days_left, base_features)
        return -metrics['netProfit']

    opt_profit = minimize_scalar(objective_func_net_profit, bounds=(0.0, 0.9), method='bounded')
    
    best_disc_profit = float(opt_profit.x)
    sc_optimal = get_prediction_metrics(best_disc_profit, product_id, inventory, days_left, base_features)
    reason = "Net Profit Optimized"
    
    # Run Other Scenarios
    sc_current = get_prediction_metrics(current_discount, product_id, inventory, days_left, base_features)
    sc_aggressive = get_prediction_metrics(0.7, product_id, inventory, days_left, base_features)
        
    # Generate Forecast
    forecast = []
    sim_inventory = float(inventory)
    for day in range(days_left):
        d = days_left - day 
        f_day_of_week = (today + timedelta(days=day)).weekday()
        f_base_features = base_features.copy()
        f_base_features['day_of_week'] = f_day_of_week
        f_base_features['is_weekend'] = int(f_day_of_week >= 5)

        def forecast_obj(discount_pct):
            metrics = get_prediction_metrics(discount_pct, product_id, sim_inventory, d, f_base_features)
            return -metrics['netProfit']

        opt_rev_forecast = minimize_scalar(forecast_obj, bounds=(0.0, 0.8), method='bounded')
        f_discount = float(opt_rev_forecast.x)
        f_metrics = get_prediction_metrics(f_discount, product_id, sim_inventory, d, f_base_features)
        
        forecast.append({
            "day": int(day + 1), "recommendedPrice": float(f_metrics['price']),
            "expectedDemand": float((f_metrics['expectedSales'] / sim_inventory if sim_inventory > 0 else 0) * 100),
            "expectedSales": float(f_metrics['expectedSales'])
        })
        sim_inventory = max(0.0, sim_inventory - f_metrics['expectedSales'])

    # Calculate Impact
    profit_increase = sc_optimal['netProfit'] - sc_current['netProfit']
    revenue_change = sc_optimal['expectedRevenue'] - sc_current['expectedRevenue']
    waste_reduction = 0.0
    if sc_current['expectedWaste'] > 0:
        waste_reduction = (sc_current['expectedWaste'] - sc_optimal['expectedWaste']) / sc_current['expectedWaste'] * 100
    
    projected_waste_value = float(sc_current.get('expectedLoss', 0.0))
    optimized_waste_value = float(sc_optimal.get('expectedLoss', 0.0))
    waste_saved_value = projected_waste_value - optimized_waste_value
    
    # Assemble Final Output
    output = {
        "predictionDate": today.isoformat(),
        "currentMetrics": {
            "currentPrice": float(sc_current['price']), "stockLevel": int(inventory),
            "daysToExpiry": int(days_left),
            "demandScore": float(np.clip(base_features['popularity'] * 50, 0, 100)),
            "salesVelocity": float(real_day_demand_factor.get(base_features['day_of_week'], 1.0) * real_category_demand_factor.get(product_info['category'], 1.0))
        },
        "recommendations": {
            "optimalPrice": float(sc_optimal['price']),
            "priceChangePercent": float((sc_optimal['price'] - sc_current['price']) / sc_current['price'] * 100 if sc_current['price'] > 0 else 0),
            "confidenceScore": float(GLOBAL_R2_SCORE * 100),
            "reasoning": reason
        },
        "scenarios": {"current": sc_current, "optimal": sc_optimal, "aggressive": sc_aggressive},
        "forecast": forecast,
        "impact": {
            "wasteReduction": float(waste_reduction),
            "profitIncrease": float(profit_increase),
            "revenueChange": float(revenue_change),
            "sellThroughRate": float((sc_optimal['expectedSales'] / inventory if inventory > 0 else 0) * 100),
            # Monetary wastage costs (used by dashboard)
            "projectedWasteValue": projected_waste_value,
            "optimizedWasteValue": optimized_waste_value,
            "wasteSavedValue": waste_saved_value
        },
        "algorithm": {
            "version": GLOBAL_MODEL_VERSION, "modelType": "xgboost",
            "features": features, "accuracy": float(GLOBAL_R2_SCORE * 100)
        }
    }
    return output

# ---
# ## 4. Create the API Endpoints
# ---

@app.route('/products', methods=['GET'])
def get_products():
    """
    Sends a list of all products (ID, name, category) to the frontend.
    This is used to populate a dropdown menu.
    """
    try:
        # Re-format the products_db for the frontend
        # We want a simple list: [ { id: "...", name: "..." }, ... ]
        product_list = [
            {
                "id": pid,
                "name": details.get("name", "Unknown"),
                "category": details.get("category", "Other")
            } 
            for pid, details in products_db.items()
        ]
        return jsonify(product_list)
    except Exception as e:
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500


@app.route('/predict', methods=['POST'])
def predict():
    """
    Receives a specific product ID, stock, and expiry
    and returns the full JSON prediction.
    """
    data = request.json
    
    try:
        product_id = data['productId']
        inventory = int(data['stockLevel'])
        days_left = int(data['daysToExpiry'])
        
        prediction_output = find_optimal_pricing(
            product_id=product_id,
            inventory=inventory,
            days_left=days_left,
            current_discount=0.0 # Assuming current discount is 0%
        )
        print(prediction_output)
        return jsonify(prediction_output)
        
    except KeyError as e:
        return jsonify({"error": f"Missing required field: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500

# ---
# ## 5. Run the Server
# ---
if __name__ == '__main__':
    # This runs the app on http://127.0.0.1:8000
    app.run(debug=True, port=8000)