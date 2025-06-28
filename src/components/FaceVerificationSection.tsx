import React from 'react';
import { Shield, CheckCircle2, Camera, AlertTriangle } from 'lucide-react';

interface FaceVerificationSectionProps {
  isFaceVerified: boolean;
  onStartVerification: () => void;
}

export default function FaceVerificationSection({
  isFaceVerified,
  onStartVerification
}: FaceVerificationSectionProps) {
  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-2 border-blue-400/30 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-full ${isFaceVerified ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
              {isFaceVerified ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <Shield className="w-6 h-6 text-yellow-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isFaceVerified ? 'Đã xác minh danh tính' : 'Xác minh danh tính'}
              </h3>
              <p className="text-sm text-gray-300">
                {isFaceVerified 
                  ? 'Bạn đã hoàn thành xác minh khuôn mặt thành công'
                  : 'Cần xác minh khuôn mặt để đăng ký hoặc cập nhật hồ sơ'
                }
              </p>
            </div>
          </div>

          {!isFaceVerified && (
            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-400 mb-1">
                    Quy trình xác minh:
                  </h4>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Upload ảnh căn cước công dân</li>
                    <li>• Chụp ảnh khuôn mặt qua webcam</li>
                    <li>• Hệ thống so sánh và xác minh</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {isFaceVerified && (
            <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <h4 className="text-sm font-medium text-green-400">
                    Xác minh thành công!
                  </h4>
                  <p className="text-xs text-gray-300">
                    Bạn có thể đăng ký hoặc cập nhật hồ sơ ngay bây giờ
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ml-4">
          <button
            type="button"
            onClick={onStartVerification}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              isFaceVerified
                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-400/30'
                : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-400/30 hover:scale-105'
            }`}
          >
            <Camera className="w-4 h-4" />
            {isFaceVerified ? 'Xác minh lại' : 'Bắt đầu xác minh'}
          </button>
        </div>
      </div>
    </div>
  );
} 