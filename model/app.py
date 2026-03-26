from flask import Flask, request, jsonify
from datetime import datetime
from main import predict

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict_endpoint():
    """
    Predict carbon intensity for a date range.
    
    Request body:
    {
        "start_date": "2026-03-23T00:00:00",
        "end_date": "2026-03-23T12:00:00",
        "model_path": "models/model_20260326_220943.pt"  (optional)
    }
    """
    try:
        data = request.get_json()
        
        # Parse dates
        start_date = datetime.fromisoformat(data['start_date'])
        end_date = datetime.fromisoformat(data['end_date'])
        
        # Get model path (default if not provided)
        model_path = data.get('model_path', 'models/model_20260326_220943.pt')
        
        # Make prediction
        result = predict(
            model_path=model_path,
            start_date=start_date,
            end_date=end_date
        )
        
        return jsonify(result), 200
        
    except KeyError as e:
        return jsonify({"error": f"Missing required field: {str(e)}"}), 400
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
