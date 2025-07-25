// Utility functions for face verification API calls

const FACE_VERIFICATION_API = import.meta.env.VITE_FACE_API_URL || 'http://127.0.0.1:5000';

export interface FaceVerificationResponse {
  success: boolean;
  message?: string;
  data?: any;
  ocr_text?: string;
}

/**
 * Upload ID card image to face verification API
 */
export const uploadIdCard = async (idCardFile: File, userId: string): Promise<FaceVerificationResponse> => {
  try {
    const formData = new FormData();
    formData.append('id_card', idCardFile);

    const response = await fetch(`${FACE_VERIFICATION_API}/upload_id_card`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'ID card uploaded successfully',
        data,
        ocr_text: data.ocr_text || ''
      };
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        success: false,
        message: errorData.message || `Failed to upload ID card (${response.status})`
      };
    }
  } catch (error) {
    console.error('Error uploading ID card:', error);
    return {
      success: false,
      message: 'Network error: Unable to connect to verification server'
    };
  }
};

/**
 * Verify webcam image against uploaded ID card
 */
export const verifyWebcamImage = async (webcamFile: File, userId: string): Promise<FaceVerificationResponse> => {
  try {
    const formData = new FormData();
    formData.append('webcam', webcamFile);

    const response = await fetch(`${FACE_VERIFICATION_API}/verify_webcam`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const responseData = await response.json();
      // Trả về đầy đủ các trường backend trả về
      return {
        success: responseData.success,
        message: responseData.message,
        data: {
          distance: responseData.distance,
          is_real: responseData.is_real,
          embedding_card: responseData.embedding_card,
          embedding_webcam: responseData.embedding_webcam,
          processing_time: responseData.processing_time,
          verify_message: responseData.message,
          face_verified: responseData.success,
        }
      };
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        success: false,
        message: errorData.message || `Failed to verify webcam image (${response.status})`
      };
    }
  } catch (error) {
    console.error('Error verifying webcam image:', error);
    return {
      success: false,
      message: 'Network error: Unable to connect to verification server'
    };
  }
};

/**
 * Convert base64 image to File object
 */
export const base64ToFile = (base64String: string, filename: string = 'webcam.jpg'): File => {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

/**
 * Check if face verification API is available
 */
export const checkFaceVerificationAPI = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${FACE_VERIFICATION_API}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('Face verification API not available:', error);
    return false;
  }
};

/**
 * Face verification workflow types
 */
export type FaceVerificationStep = 'upload' | 'webcam' | 'verifying' | 'success' | 'failed';

export interface FaceVerificationState {
  step: FaceVerificationStep;
  idCardFile: File | null;
  idCardPreview: string | null;
  webcamImage: string | null;
  isWebcamActive: boolean;
  error: string | null;
} 