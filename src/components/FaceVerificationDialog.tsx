import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle, XCircle, RotateCcw, Shield, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { 
  uploadIdCard, 
  verifyWebcamImage, 
  base64ToFile, 
  FaceVerificationStep 
} from '@/utils/faceVerification';

interface FaceVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess: () => void;
  userId: string;
  onOcrExtract?: (fields: { name?: string; cccd?: string; ocrText: string }) => void;
}

export default function FaceVerificationDialog({
  isOpen,
  onClose,
  onVerificationSuccess,
  userId,
  onOcrExtract
}: FaceVerificationDialogProps) {
  const [step, setStep] = useState<FaceVerificationStep>('upload');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [webcamImage, setWebcamImage] = useState<string | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultDetails, setResultDetails] = useState<any>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setIdCardFile(null);
      setIdCardPreview(null);
      setWebcamImage(null);
      setIsWebcamActive(false);
      setError(null);
      setIsLoading(false);
      setResultDetails(null);
      setOcrText(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle ID card upload
  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdCardFile(file);
      setIdCardPreview(URL.createObjectURL(file));
      setError(null);
      setStep('upload');
      setWebcamImage(null);
      setIsWebcamActive(false);
      stopWebcam();
    }
  };

  // Handle ID card submission
  const handleSubmitIdCard = async () => {
    if (!idCardFile) {
      setError('Vui lòng chọn ảnh căn cước');
      return;
    }

    setStep('verifying');
    setError(null);
    setIsLoading(true);

    // Set timeout for upload
    timeoutRef.current = setTimeout(() => {
      setError('❌ Hệ thống phản hồi chậm. Vui lòng thử lại.');
      setStep('upload');
      setIsLoading(false);
    }, 30000); // 30 seconds timeout

    try {
      const result = await uploadIdCard(idCardFile, userId);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (result.success) {
        toast.success('Ảnh căn cước đã được tải lên thành công');
        setStep('webcam');
        setIsLoading(false);
        startWebcam();
        setResultDetails(result.data);
        setOcrText(result.ocr_text || (result.data && result.data.ocr_text) || null);
        if (typeof onOcrExtract === 'function') {
          // Ưu tiên lấy từ backend, nếu không có thì tự lọc lại từ ocrText
          let name = result.data?.name;
          let cccd = result.data?.cccd;
          const ocrText = result.data?.ocr_text || result.ocr_text || '';
          if (!cccd) {
            const m = ocrText.match(/\b\d{12}\b/);
            if (m) cccd = m[0];
          }
          if (!name) {
            const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let found = false;
            for (let i = 0; i < lines.length; ++i) {
              if (lines[i].toLowerCase().includes('họ và tên') || lines[i].toLowerCase().includes('full name')) {
                for (let j = i+1; j < Math.min(i+3, lines.length); ++j) {
                  const candidate = lines[j].replace(/[^A-ZÀ-Ỹ\s]/g, '').trim();
                  if (candidate.split(/\s+/).length >= 2) {
                    name = candidate;
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
            }
            if (!name) {
              const candidates = lines.filter(l => /^[A-ZÀ-Ỹ\s]{5,}$/.test(l) && !/\d/.test(l) && l.split(/\s+/).length >= 2);
              if (candidates.length > 0) name = candidates.reduce((a, b) => a.length > b.length ? a : b);
            }
          }
          onOcrExtract({ name, cccd, ocrText });
        }
      } else {
        setError(result.message || 'Lỗi khi tải ảnh căn cước');
        setStep('upload');
        setIsLoading(false);
        setResultDetails(result.data);
        setOcrText(null);
      }
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.error('Upload ID card error:', error);
      setError('Lỗi kết nối đến server xác minh. Vui lòng kiểm tra kết nối mạng.');
      setStep('upload');
      setIsLoading(false);
      setResultDetails(null);
      setOcrText(null);
    }
  };

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsWebcamActive(true);
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setError('Không thể truy cập webcam. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  // Capture webcam photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setWebcamImage(imageData);
      }
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setWebcamImage(null);
    setStep('webcam');
    startWebcam();
  };

  // Verify face
  const verifyFace = async () => {
    if (!webcamImage) {
      setError('Vui lòng chụp ảnh từ webcam');
      return;
    }

    setStep('verifying');
    setError(null);
    setIsLoading(true);

    // Set timeout for verification
    timeoutRef.current = setTimeout(() => {
      setError('Hệ thống xác minh phản hồi chậm. Vui lòng thử lại.');
      setStep('failed');
      setIsLoading(false);
    }, 30000); // 30 seconds timeout

    try {
      const webcamFile = base64ToFile(webcamImage);
      const result = await verifyWebcamImage(webcamFile, userId);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      console.log('Verification result:', result); // Debug log

      if (result.success) {
        setStep('success');
        setIsLoading(false);
        toast.success('Xác minh khuôn mặt thành công!');
        setTimeout(() => {
          onVerificationSuccess();
          onClose();
        }, 2000);
        setResultDetails(result.data);
      } else {
        setStep('failed');
        setIsLoading(false);
        setError(result.message || 'Xác minh thất bại. Vui lòng thử lại.');
        setResultDetails(result.data);
      }
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.error('Face verification error:', error);
      setError('Lỗi kết nối khi xác minh khuôn mặt. Vui lòng kiểm tra kết nối mạng.');
      setStep('failed');
      setIsLoading(false);
      setResultDetails(null);
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsWebcamActive(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Hàm tách thông tin từ ocrText
  function extractFieldsFromOcr(ocrText: string): { name?: string; cccd?: string } {
    let nameMatch = ocrText.match(/Họ và tên\s*[:\-]?\s*([A-ZÀ-ỸA-Z ]+)/i);
    let cccdMatch = ocrText.match(/Số\s*(CMND|CCCD|ID|CMT)?\s*[:\-]?\s*(\d{9,12})/i);
    let name = nameMatch ? nameMatch[1].trim() : undefined;
    let cccd = cccdMatch ? cccdMatch[2] : undefined;
    // Nếu không match, thử lấy dòng in hoa dài nhất làm tên
    if (!name) {
      const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const upperLines = lines.filter(l => l === l.toUpperCase() && l.length > 5);
      if (upperLines.length > 0) name = upperLines[0];
    }
    return { name, cccd };
  }

  // Sau khi setOcrText, tự động extract và truyền về parent nếu có onOcrExtract
  useEffect(() => {
    if (ocrText && typeof onOcrExtract === 'function') {
      const fields = extractFieldsFromOcr(ocrText);
      onOcrExtract({ ...fields, ocrText: ocrText });
    }
    // eslint-disable-next-line
  }, [ocrText]);

  // Log debug khi có ocrText
  useEffect(() => {
    if (ocrText) {
      console.log('[DEBUG][OCR CCCD]', ocrText);
    }
  }, [ocrText]);

  // Hàm reset về bước upload khi thử ảnh khác
  const handleTryAnotherIdCard = () => {
    setStep('upload');
    setIdCardFile(null);
    setIdCardPreview(null);
    setWebcamImage(null);
    setIsWebcamActive(false);
    setError(null);
    stopWebcam();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-full">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            Xác minh danh tính
          </DialogTitle>
          <p className="text-center text-gray-400 mt-2">
            Vui lòng thực hiện các bước sau để xác minh danh tính của bạn
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className={`flex items-center gap-2 ${step === 'upload' || step === 'verifying' || step === 'webcam' || step === 'success' ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'upload' || step === 'verifying' || step === 'webcam' || step === 'success' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-600 text-gray-300'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Upload CCCD</span>
            </div>
            <div className="w-8 h-1 bg-gray-600"></div>
            <div className={`flex items-center gap-2 ${step === 'webcam' || step === 'verifying' || step === 'success' ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'webcam' || step === 'verifying' || step === 'success' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-600 text-gray-300'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Chụp ảnh</span>
            </div>
            <div className="w-8 h-1 bg-gray-600"></div>
            <div className={`flex items-center gap-2 ${step === 'success' ? 'text-green-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'success' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-600 text-gray-300'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">Hoàn thành</span>
            </div>
          </div>

          {/* Step 1: Upload ID Card */}
          {step === 'upload' && (
            <Card className="border-2 border-blue-400/30">
              <CardHeader className="bg-blue-500/10">
                <CardTitle className="flex items-center gap-3 text-blue-400">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <Upload className="w-6 h-6" />
                  </div>
                  Bước 1: Tải ảnh căn cước công dân
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="bg-blue-500/5 border border-blue-400/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-400 mb-2">Hướng dẫn:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Chọn ảnh căn cước công dân hoặc chứng minh nhân dân</li>
                    <li>• Ảnh phải rõ nét, có thể nhìn thấy khuôn mặt</li>
                    <li>• Định dạng: JPG, PNG, JPEG</li>
                    <li>• Kích thước tối đa: 10MB</li>
                  </ul>
                </div>
                
                <div className="text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIdCardUpload}
                    className="hidden"
                    id="idCardInput"
                    aria-label="Upload ID card image"
                  />
                  <label htmlFor="idCardInput" className="cursor-pointer block">
                    <div className="p-4 bg-blue-500/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Upload className="w-10 h-10 text-blue-400" />
                    </div>
                    <p className="text-lg font-medium text-blue-400 mb-2">
                      {idCardFile ? 'Đã chọn ảnh' : 'Click để chọn ảnh căn cước'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {idCardFile ? idCardFile.name : 'Hoặc kéo thả ảnh vào đây'}
                    </p>
                  </label>
                </div>

                {idCardPreview && (
                  <div className="text-center">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Xem trước ảnh:</h4>
                    <img 
                      src={idCardPreview} 
                      alt="ID Card Preview" 
                      className="max-w-sm mx-auto rounded-lg border-2 border-blue-400/30 shadow-lg"
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Lỗi:</span>
                    </div>
                    <p className="text-sm text-red-300 mt-1">{error}</p>
                  </div>
                )}

                <Button 
                  onClick={handleSubmitIdCard}
                  disabled={!idCardFile || isLoading}
                  className="w-full py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Đang tải lên...
                    </>
                  ) : (!idCardFile ? 'Vui lòng chọn ảnh trước' : 'Tiếp tục → Bước 2')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Webcam Capture */}
          {step === 'webcam' && (
            <Card className="border-2 border-blue-400/30">
              <CardHeader className="bg-blue-500/10">
                <CardTitle className="flex items-center gap-3 text-blue-400">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <Camera className="w-6 h-6" />
                  </div>
                  Bước 2: Chụp ảnh khuôn mặt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="bg-blue-500/5 border border-blue-400/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-400 mb-2">Hướng dẫn chụp ảnh:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Đặt khuôn mặt vào khung hình</li>
                    <li>• Đảm bảo ánh sáng đủ sáng</li>
                    <li>• Nhìn thẳng vào camera</li>
                    <li>• Không đeo kính râm hoặc mũ</li>
                  </ul>
                </div>

                <div className="text-center">
                  {!webcamImage ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        className="w-full max-w-2xl mx-auto"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-80 border-2 border-blue-400 rounded-lg opacity-50"></div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={webcamImage}
                      alt="Captured Photo"
                      className="w-full max-w-2xl mx-auto rounded-xl"
                    />
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex justify-center gap-4">
                  {!webcamImage ? (
                    <Button 
                      onClick={capturePhoto} 
                      className="px-10 py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg flex items-center gap-2 transition-all duration-200"
                    >
                      <Camera className="w-6 h-6" />
                      Chụp ảnh
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={retakePhoto}
                        disabled={isLoading}
                        className="px-8 py-4 text-lg font-bold rounded-xl border-blue-400/50 text-blue-400 hover:bg-blue-400/10 shadow-md flex items-center gap-2 transition-all duration-200"
                      >
                        <RotateCcw className="w-6 h-6" />
                        Chụp lại
                      </Button>
                      <Button 
                        onClick={verifyFace}
                        disabled={isLoading}
                        className="px-10 py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 shadow-lg flex items-center gap-2 transition-all duration-200"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Đang xác minh...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-6 h-6" />
                            Xác minh ngay
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Verifying */}
          {step === 'verifying' && (
            <Card className="border-2 border-blue-400/30">
              <CardHeader className="bg-blue-500/10">
                <CardTitle className="text-center text-blue-400">
                  Đang xác minh khuôn mặt...
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6 py-8">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Hệ thống đang xác minh...
                  </h3>
                  <p className="text-gray-400">
                    Đang so sánh khuôn mặt với ảnh căn cước và kiểm tra tính xác thực
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Vui lòng đợi trong giây lát...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Result */}
          {step === 'success' && (
            <Card className="border-2 border-green-400/30">
              <CardContent className="text-center space-y-6 py-12">
                <div className="relative">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">
                    Xác minh thành công!
                  </h3>
                  <p className="text-gray-300 text-lg">
                    Khuôn mặt của bạn đã được xác minh thành công.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Bạn có thể tiếp tục đăng ký hoặc cập nhật hồ sơ.
                  </p>
                  {resultDetails && (
                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-inner text-xs text-white space-y-2">
                      <div><b>Distance:</b> <span className="text-yellow-300">{resultDetails.distance}</span></div>
                      <div><b>Anti-spoof:</b> <span className={resultDetails.is_real ? 'text-green-400' : 'text-red-400'}>{resultDetails.is_real ? 'Thật' : 'Giả'}</span></div>
                      <div><b>Thời gian xử lý:</b> <span className="text-blue-300">{resultDetails.processing_time?.toFixed(3)}s</span></div>
                      <details>
                        <summary className="cursor-pointer text-blue-200">Embedding Card</summary>
                        <div className="break-all text-gray-300">{JSON.stringify(resultDetails.embedding_card)}</div>
                      </details>
                      <details>
                        <summary className="cursor-pointer text-blue-200">Embedding Webcam</summary>
                        <div className="break-all text-gray-300">{JSON.stringify(resultDetails.embedding_webcam)}</div>
                      </details>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed Result */}
          {step === 'failed' && (
            <Card className="border-2 border-red-400/30">
              <CardContent className="text-center space-y-6 py-12">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-red-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-red-400 mb-2">
                    Xác minh thất bại
                  </h3>
                  <p className="text-gray-300 text-lg mb-4">
                    {error || 'Khuôn mặt không khớp hoặc ảnh giả. Vui lòng thử lại.'}
                  </p>
                  {resultDetails && (
                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-inner text-xs text-white space-y-2">
                      <div><b>Distance:</b> <span className="text-yellow-300">{resultDetails.distance}</span></div>
                      <div><b>Anti-spoof:</b> <span className={resultDetails.is_real ? 'text-green-400' : 'text-red-400'}>{resultDetails.is_real ? 'Thật' : 'Giả'}</span></div>
                      <div><b>Thời gian xử lý:</b> <span className="text-blue-300">{resultDetails.processing_time?.toFixed(3)}s</span></div>
                      <details>
                        <summary className="cursor-pointer text-blue-200">Embedding Card</summary>
                        <div className="break-all text-gray-300">{JSON.stringify(resultDetails.embedding_card)}</div>
                      </details>
                      <details>
                        <summary className="cursor-pointer text-blue-200">Embedding Webcam</summary>
                        <div className="break-all text-gray-300">{JSON.stringify(resultDetails.embedding_webcam)}</div>
                      </details>
                    </div>
                  )}
                  <div className="space-y-3">
                    <Button 
                      onClick={handleTryAnotherIdCard}
                      variant="destructive"
                      type="button"
                      className="px-8 py-4 text-lg font-bold rounded-xl flex items-center gap-2"
                    >
                      <RotateCcw className="w-6 h-6" />
                      Thử lại với ảnh khác
                    </Button>
                    <Button 
                      onClick={() => {
                        setStep('upload');
                        setError(null);
                        setIdCardFile(null);
                        setIdCardPreview(null);
                        setWebcamImage(null);
                        setIsLoading(false);
                        setResultDetails(null);
                      }}
                      variant="outline"
                      className="px-8 py-4 text-lg font-bold rounded-xl border-blue-400/50 text-blue-400 hover:bg-blue-400/10 shadow-md transition-all duration-200"
                    >
                      <Upload className="w-6 h-6" />
                      Thay đổi ảnh căn cước
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 