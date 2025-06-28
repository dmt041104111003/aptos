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
}

export default function FaceVerificationDialog({
  isOpen,
  onClose,
  onVerificationSuccess,
  userId
}: FaceVerificationDialogProps) {
  const [step, setStep] = useState<FaceVerificationStep>('upload');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [webcamImage, setWebcamImage] = useState<string | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setIdCardFile(null);
      setIdCardPreview(null);
      setWebcamImage(null);
      setIsWebcamActive(false);
      setError(null);
    }
  }, [isOpen]);

  // Handle ID card upload
  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdCardFile(file);
      setIdCardPreview(URL.createObjectURL(file));
      setError(null);
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

    try {
      const result = await uploadIdCard(idCardFile, userId);
      
      if (result.success) {
        toast.success('Ảnh căn cước đã được tải lên thành công');
        setStep('webcam');
        startWebcam();
      } else {
        setError(result.message || 'Lỗi khi tải ảnh căn cước');
        setStep('upload');
      }
    } catch (error) {
      setError('Lỗi kết nối đến server xác minh');
      setStep('upload');
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
  };

  // Verify face
  const verifyFace = async () => {
    if (!webcamImage) {
      setError('Vui lòng chụp ảnh từ webcam');
      return;
    }

    setStep('verifying');
    setError(null);

    try {
      const webcamFile = base64ToFile(webcamImage);
      const result = await verifyWebcamImage(webcamFile, userId);

      if (result.success && result.data?.isSame) {
        setStep('success');
        toast.success('✅ Xác minh khuôn mặt thành công!');
        setTimeout(() => {
          onVerificationSuccess();
          onClose();
        }, 2000);
      } else {
        setStep('failed');
        setError(result.message || 'Khuôn mặt không khớp hoặc ảnh giả');
      }
    } catch (error) {
      setError('❌ Lỗi khi xác minh khuôn mặt');
      setStep('failed');
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
    };
  }, []);

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
                
                <div className="border-2 border-dashed border-blue-400/50 rounded-xl p-8 text-center hover:border-blue-400/70 transition-colors">
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
                  disabled={!idCardFile}
                  className="w-full py-3 text-lg font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!idCardFile ? 'Vui lòng chọn ảnh trước' : 'Tiếp tục → Bước 2'}
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
                  <h4 className="font-medium text-blue-400 mb-2">📸 Hướng dẫn chụp ảnh:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Đặt khuôn mặt vào khung hình</li>
                    <li>• Đảm bảo ánh sáng đủ sáng</li>
                    <li>• Nhìn thẳng vào camera</li>
                    <li>• Không đeo kính râm hoặc mũ</li>
                  </ul>
                </div>

                <div className="relative bg-black rounded-xl overflow-hidden">
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

                <div className="flex gap-4 justify-center">
                  {!webcamImage ? (
                    <Button 
                      onClick={capturePhoto} 
                      className="px-8 py-3 text-lg font-medium bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Chụp ảnh
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={retakePhoto}
                        className="px-6 py-3 text-lg font-medium border-blue-400/30 text-blue-400 hover:bg-blue-400/10 flex items-center gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Chụp lại
                      </Button>
                      <Button 
                        onClick={verifyFace}
                        className="px-8 py-3 text-lg font-medium bg-green-600 hover:bg-green-700 flex items-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Xác minh ngay
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
                  <div className="space-y-3">
                    <Button 
                      onClick={() => {
                        setStep('webcam');
                        setError(null);
                        setWebcamImage(null);
                      }}
                      variant="outline"
                      className="px-6 py-3 text-lg font-medium border-red-400/30 text-red-400 hover:bg-red-400/10"
                    >
                      Thử lại với ảnh khác
                    </Button>
                    <Button 
                      onClick={() => {
                        setStep('upload');
                        setError(null);
                        setIdCardFile(null);
                        setIdCardPreview(null);
                        setWebcamImage(null);
                      }}
                      variant="outline"
                      className="px-6 py-3 text-lg font-medium border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                    >
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