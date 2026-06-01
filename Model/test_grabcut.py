import cv2
import numpy as np

def test_grabcut():
    # Create a dummy image
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[20:80, 20:80] = (0, 0, 255) # Red square
    
    mask = np.zeros(img.shape[:2], np.uint8)
    bgdModel = np.zeros((1,65), np.float64)
    fgdModel = np.zeros((1,65), np.float64)
    
    h, w = img.shape[:2]
    rect = (int(w*0.1), int(h*0.1), int(w*0.8), int(h*0.8))
    
    cv2.grabCut(img, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)
    food_mask = np.where((mask==2)|(mask==0), 0, 255).astype('uint8')
    print("GrabCut works. Mask unique values:", np.unique(food_mask))

if __name__ == '__main__':
    test_grabcut()
