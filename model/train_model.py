
import json
import pandas as pd
import torch
from transformers import PatchTSTConfig, PatchTSTForPrediction
from datetime import datetime
import os

# Create models directory if it doesn't exist
os.makedirs("models", exist_ok=True)

with open("carbon_data.json", "r") as f:
    data = json.load(f)

print(data)

df = pd.DataFrame(data)
df['datetime'] = pd.to_datetime(df['datetime'])

df_pivot = df.pivot(index='datetime', columns='zone', values='carbonIntensity')
df_pivot = df_pivot.sort_index()
df_pivot = df_pivot.ffill()  # forward-fill missing values

past_values = torch.tensor(df_pivot.values, dtype=torch.float).unsqueeze(0)


prediction_length = 24  # change as needed
config = PatchTSTConfig(
    context_length=past_values.shape[1],
    prediction_length=prediction_length,
    num_input_channels=past_values.shape[2],
)

model = PatchTSTForPrediction(config)

outputs = model(past_values=past_values)
predicted = outputs.prediction_outputs.detach().numpy()  # shape (1, pred_len, num_channels)

pred_df = pd.DataFrame(predicted[0], columns=df_pivot.columns)

# Create datetime index for forecast
forecast_start = df_pivot.index[-1] + pd.Timedelta(hours=1)
forecast_index = [forecast_start + pd.Timedelta(hours=i) for i in range(pred_df.shape[0])]
pred_df.index = forecast_index

min_idx = pred_df.stack().idxmin()  # (datetime, zone)
min_value = pred_df.loc[min_idx[0], min_idx[1]]

print("Predicted carbon intensity for next", prediction_length, "hours:\n")
print(pred_df)
print("\nBest region:", min_idx[1])
print("Best time:", min_idx[0])
print("Predicted carbon intensity:", min_value)

# Save the model with timestamp
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
model_path = f"models/model_{timestamp}.pt"
torch.save(model.state_dict(), model_path)
print(f"\nModel saved to: {model_path}")