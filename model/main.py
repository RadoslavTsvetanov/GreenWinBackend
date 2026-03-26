import torch
from transformers import PatchTSTConfig, PatchTSTForPrediction
from typing import Dict


def load_model(
    model_path: str,
    context_length: int,
    prediction_length: int,
    num_input_channels: int
) -> PatchTSTForPrediction:
    """
    Load a trained PatchTST model.
    
    Args:
        model_path: Path to the model file
        context_length: Length of input context
        prediction_length: Length of prediction horizon
        num_input_channels: Number of input channels/zones
    
    Returns:
        Loaded model ready for inference
    """
    config = PatchTSTConfig(
        context_length=context_length,
        prediction_length=prediction_length,
        num_input_channels=num_input_channels,
    )
    
    model = PatchTSTForPrediction(config)
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()
    
    return model


def create_prediction(
    model: PatchTSTForPrediction,
    input_data: torch.Tensor
) -> Dict:
    """
    Create predictions using a loaded model.
    
    Args:
        model: Pre-loaded PatchTST model
        input_data: Tensor of shape (batch_size, context_length, num_channels)
    
    Returns:
        Dictionary containing predictions as numpy array
    """
    with torch.no_grad():
        outputs = model(past_values=input_data)
        predictions = outputs.prediction_outputs.detach().numpy()
    
    return {
        "predictions": predictions,
        "shape": predictions.shape
    }


if __name__ == "__main__":
    # Example usage
    model = load_model(
        model_path="models/model_20260326_220943.pt",
        context_length=168,  # Must match training config
        prediction_length=24,
        num_input_channels=4
    )
    
    # Create input data (batch_size=1, context_length=168, num_channels=4)
    dummy_input = torch.randn(1, 168, 4)
    
    result = create_prediction(model, dummy_input)
    
    print(f"Prediction shape: {result['shape']}")
    print(f"First prediction: {result['predictions'][0, 0, :]}")
