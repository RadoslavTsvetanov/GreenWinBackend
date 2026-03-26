import torch
from transformers import PatchTSTConfig, PatchTSTForPrediction
from typing import Dict, List
from datetime import datetime, timedelta
import pandas as pd
import json


def predict(
    model_path: str,
    start_date: datetime,
    end_date: datetime,
    data_path: str = "carbon_data.json",
    zones: List[str] = None
) -> Dict:
    """
    Load a model and make predictions for a date range.
    
    Args:
        model_path: Path to the trained model
        start_date: When to start predictions
        end_date: When to end predictions (max 24 hours from start)
        data_path: Path to historical carbon data JSON
        zones: List of zone names (default: ['SE', 'FR', 'DE', 'AO'])
    
    Returns:
        Dictionary with best timeframe info in the requested range
    """
    if zones is None:
        zones = ['SE', 'FR', 'DE', 'AO']
    
    # Calculate prediction length
    prediction_hours = int((end_date - start_date).total_seconds() / 3600)
    if prediction_hours > 24:
        raise ValueError("Prediction range cannot exceed 24 hours")
    if prediction_hours <= 0:
        raise ValueError("end_date must be after start_date")
    
    # Load historical data
    with open(data_path, "r") as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    df['datetime'] = pd.to_datetime(df['datetime'])
    
    # Make dates timezone-aware to match the data
    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=df['datetime'].dt.tz)
    if end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=df['datetime'].dt.tz)
    
    # Pivot data
    df_pivot = df.pivot(index='datetime', columns='zone', values='carbonIntensity')
    df_pivot = df_pivot.sort_index()
    df_pivot = df_pivot.ffill()
    
    # Get 168 hours of context before start_date
    context_start = start_date - timedelta(hours=168)
    context_data = df_pivot[(df_pivot.index >= context_start) & (df_pivot.index < start_date)]
    
    if len(context_data) < 168:
        raise ValueError(f"Not enough historical data before {start_date}. Need 168 hours of context.")
    
    context_data = context_data.tail(168)
    
    # Convert to tensor
    past_values = torch.tensor(context_data.values, dtype=torch.float).unsqueeze(0)
    
    # Load model
    config = PatchTSTConfig(
        context_length=168,
        prediction_length=24,
        num_input_channels=len(zones),
    )
    
    model = PatchTSTForPrediction(config)
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()
    
    # Make predictions
    with torch.no_grad():
        outputs = model(past_values=past_values)
        predicted = outputs.prediction_outputs.detach().numpy()
    
    # Create prediction dataframe
    pred_df = pd.DataFrame(predicted[0], columns=zones)
    
    # Create datetime index for forecast
    forecast_index = [start_date + timedelta(hours=i) for i in range(24)]
    pred_df.index = forecast_index
    
    # Filter to requested range
    pred_df = pred_df[(pred_df.index >= start_date) & (pred_df.index <= end_date)]
    
    # Find best time and region in the requested range
    min_idx = pred_df.stack().idxmin()
    min_value = pred_df.loc[min_idx[0], min_idx[1]]
    
    # Get indices
    best_time_index = list(pred_df.index).index(min_idx[0])
    best_zone_index = zones.index(min_idx[1])
    
    # Convert predictions to list format
    predictions_list = []
    for date, row in pred_df.iterrows():
        for zone in zones:
            predictions_list.append({
                "datetime": date.isoformat(),
                "zone": zone,
                "carbonIntensity": float(row[zone])
            })
    
    return {
        "predictions": predictions_list,
        "best_region": min_idx[1],
        "best_region_index": best_zone_index,
        "best_time": min_idx[0].isoformat(),
        "best_time_index": best_time_index,
        "min_carbon_intensity": float(min_value),
        "forecast_start": start_date.isoformat(),
        "forecast_end": end_date.isoformat(),
        "prediction_length": len(pred_df)
    }


if __name__ == "__main__":
    # Data runs from 2026-03-16 to 2026-03-22
    # We need 168 hours before start_date, so earliest prediction is 2026-03-23
    start_date = datetime(2026, 3, 23, 0, 0, 0)
    end_date = datetime(2026, 3, 23, 12, 0, 0)  # 12 hours from start
    
    result = predict(
        model_path="models/model_20260326_220943.pt",
        start_date=start_date,
        end_date=end_date
    )
    
    print(f"\nRequested prediction range: {result['forecast_start']} to {result['forecast_end']}")
    print(f"Prediction length: {result['prediction_length']} hours")
    print(f"\nBest timeframe in this range:")
    print(f"  Region: {result['best_region']} (index: {result['best_region_index']})")
    print(f"  Time: {result['best_time']} (hour {result['best_time_index']} from start)")
    print(f"  Carbon intensity: {result['min_carbon_intensity']:.2f}")
    print(f"\nFirst 12 predictions:")
    for pred in result['predictions'][:12]:
        print(f"  {pred['datetime']} - {pred['zone']}: {pred['carbonIntensity']:.2f}")
