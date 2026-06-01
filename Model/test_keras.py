import sys
try:
    from keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input, decode_predictions
    from keras.preprocessing import image
    import numpy as np
    print("Keras MobileNetV2 is available!")
except Exception as e:
    print(f"Error importing: {e}")
