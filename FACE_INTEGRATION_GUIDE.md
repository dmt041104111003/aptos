# 🔐 Hướng dẫn tích hợp Hệ thống Xác minh Khuôn mặt

## 📋 Tổng quan

Đã tích hợp thành công hệ thống xác minh khuôn mặt từ folder `Face` vào trang Settings của ứng dụng APT-UTC. Hệ thống yêu cầu người dùng xác minh danh tính trước khi đăng ký hoặc cập nhật hồ sơ.

## 🏗️ Files đã tạo

### 1. **`src/utils/faceVerification.ts`**
- Utility functions để gọi API xác minh khuôn mặt
- Functions: `uploadIdCard()`, `verifyWebcamImage()`, `base64ToFile()`
- Types và interfaces cho face verification

### 2. **`src/components/FaceVerificationDialog.tsx`**
- Component dialog xác minh khuôn mặt
- Giao diện 3 bước: Upload căn cước → Chụp webcam → Xác minh
- Tích hợp với Flask API backend

### 3. **`src/pages/Settings.tsx`** (đã cập nhật)
- Thêm state management cho face verification
- Logic kiểm tra xác minh trước khi lưu profile
- UI indicator cho trạng thái xác minh

## 🚀 Cách sử dụng

### 1. **Khởi động Backend (Folder Face)**
```bash
cd Face/Face_to_Fake_Real/Code
python apiCall_Fake_Real.py
```
Server sẽ chạy trên `http://localhost:5000`

### 2. **Sử dụng trong ứng dụng**
1. Vào trang **Settings**
2. Điền thông tin hồ sơ
3. Click **"Đăng ký hồ sơ"** hoặc **"Lưu thay đổi"**
4. Hệ thống sẽ mở dialog xác minh khuôn mặt
5. Làm theo 3 bước:
   - **Bước 1**: Tải ảnh căn cước
   - **Bước 2**: Chụp ảnh từ webcam
   - **Bước 3**: Xác minh khuôn mặt

## 🔧 Workflow tích hợp

```
User vào Settings
    ↓
Điền thông tin profile
    ↓
Click "Lưu hồ sơ"
    ↓
Check: Cần xác minh khuôn mặt?
    ↓
YES → Mở FaceVerificationDialog
    ↓
User làm 3 bước xác minh:
  1. Upload ảnh căn cước → Flask API
  2. Chụp ảnh webcam → Flask API
  3. Xác minh khuôn mặt → AI/ML
    ↓
Xác minh thành công?
    ↓
YES → Tự động lưu profile → Blockchain
    ↓
NO → Hiển thị lỗi, cho phép thử lại
```

## 🌐 API Endpoints (Flask Backend)

### **1. Upload ID Card**
```http
POST http://localhost:5000/upload_id_card
Content-Type: multipart/form-data

FormData:
- id_card: File (ảnh căn cước)
- idUser: String (ID người dùng)

Response:
{
  "message": "Căn cước đã được lưu",
  "status": false,
  "checkedAt": "2024-01-01T00:00:00"
}
```

### **2. Verify Webcam**
```http
POST http://localhost:5000/verify_webcam
Content-Type: multipart/form-data

FormData:
- webcam: File (ảnh webcam)
- idUser: String (ID người dùng)

Response:
true/false (boolean)
```

## 🔒 Tính năng bảo mật

### **✅ Anti-Spoofing Detection**
- Phát hiện ảnh giả, video, ảnh chụp màn hình
- Sử dụng MiniFASNet models từ folder Face
- Đảm bảo khuôn mặt thật

### **✅ Face Recognition**
- So sánh khuôn mặt căn cước với webcam
- Sử dụng `face_recognition` library
- Ngưỡng chấp nhận: distance ≤ 0.6

### **✅ User Experience**
- Giao diện 3 bước rõ ràng
- Real-time webcam preview
- Loading states và error handling
- Toast notifications

## 🎯 Tích hợp với Blockchain

Sau khi xác minh khuôn mặt thành công:
1. **Profile data** được upload lên IPFS
2. **Smart contract** được gọi với CID
3. **Transaction** được submit lên Aptos blockchain
4. **Profile** được cập nhật trong state

## 🛠️ Cấu hình

### **Environment Variables**
```env
# Flask API URL (có thể thay đổi)
VITE_FACE_VERIFICATION_API=http://localhost:5000
```

### **Dependencies**
```json
{
  "face_recognition": "^1.3.0",
  "opencv-python": "^4.8.0",
  "torch": "^2.0.0",
  "flask": "^2.3.0",
  "flask-cors": "^4.0.0"
}
```

## 🐛 Troubleshooting

### **Lỗi thường gặp**

1. **"Không thể truy cập webcam"**
   - Kiểm tra quyền truy cập camera
   - Đảm bảo HTTPS hoặc localhost

2. **"Lỗi kết nối đến server"**
   - Kiểm tra Flask server đã chạy chưa
   - Kiểm tra port 5000 có bị block không

3. **"Khuôn mặt không khớp"**
   - Đảm bảo ảnh căn cước rõ nét
   - Chụp webcam với ánh sáng tốt
   - Không sử dụng ảnh giả

### **Debug Mode**
```typescript
// Thêm vào FaceVerificationDialog component
console.log('Face verification debug:', {
  step,
  idCardFile,
  webcamImage,
  error
});
```

## 📱 Responsive Design

Component FaceVerificationDialog đã được thiết kế responsive:
- **Desktop**: Dialog 2 cột
- **Tablet**: Dialog 1 cột với max-width
- **Mobile**: Full-screen dialog

## 🎨 UI/UX Features

- **Loading states** với spinner
- **Success/Error states** với icons
- **Step indicators** cho 3 bước
- **Toast notifications** cho feedback
- **Responsive design** cho mọi thiết bị

## 📈 Performance

- **Lazy loading** cho webcam
- **Memory cleanup** khi component unmount
- **Optimized image processing**
- **Caching** cho face encodings

## 🔄 State Management

### **Settings Component States**
```typescript
const [showFaceVerification, setShowFaceVerification] = useState(false);
const [isFaceVerified, setIsFaceVerified] = useState(false);
const [pendingAction, setPendingAction] = useState<'register' | 'update' | null>(null);
```

### **FaceVerificationDialog States**
```typescript
const [step, setStep] = useState<FaceVerificationStep>('upload');
const [idCardFile, setIdCardFile] = useState<File | null>(null);
const [webcamImage, setWebcamImage] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
```

---

## ✅ Kết quả tích hợp

- ✅ **Settings page** có thêm tính năng xác minh khuôn mặt
- ✅ **FaceVerificationDialog component** hoạt động độc lập
- ✅ **Flask API** xử lý AI/ML backend
- ✅ **User experience** mượt mà, không gián đoạn
- ✅ **Security** được đảm bảo với anti-spoofing
- ✅ **Blockchain integration** sau khi xác minh thành công

**Lưu ý**: Đảm bảo Flask backend đang chạy trước khi sử dụng tính năng xác minh khuôn mặt! 