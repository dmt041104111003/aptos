APT - UTC: Decentralized Talent Marketplace on Aptos
====================================================

Giới thiệu
----------
APT - UTC là nền tảng marketplace phi tập trung kết nối freelancer và khách hàng trong lĩnh vực Web3, phát triển độc quyền bởi đội ngũ APT - UTC. Sản phẩm được xây dựng trên blockchain Aptos với smart contract Move, giao diện React, định danh on-chain, lưu trữ hồ sơ trên IPFS và tích hợp AI matching. Tất cả ý tưởng, thiết kế, mã nguồn đều do APT - UTC phát triển, không sao chép từ bất kỳ nền tảng nào khác.

Tính năng chính
---------------
- Kết nối ví Aptos để xác thực định danh phi tập trung (on-chain DID).
- Xây dựng và cập nhật hồ sơ cá nhân, lưu trữ trên IPFS.
- Lịch sử cập nhật hồ sơ (on-chain event history) với phân trang.
- Chuyển quyền sở hữu hồ sơ sang ví khác.
- AI ngăn đăng job ảo.
- Hệ thống tin nhắn phi tập trung với tính năng kiểm tra nội dung độc hại (toxicity check).
- Đánh giá, điểm uy tín, xác thực kỹ năng on-chain.
- Hiển thị chi tiết cách tính điểm danh tiếng.
- Đăng dự án, tìm kiếm freelancer, xác thực hồ sơ trực tiếp từ blockchain.
- Thanh toán minh bạch, bảo mật qua smart contract Move.
- Quản lý dự án với phân trang và trạng thái chi tiết.
- Lưu trữ lịch sử giao dịch.
- Nút làm mới trang thống nhất trên Dashboard, MyProfile và Messages.

Công nghệ sử dụng
-----------------
- Frontend: React, Tailwind CSS, Context API
- Wallet/Auth: Aptos Wallet Adapter (Petra)
- State Management: React Context, Custom Hooks
- Blockchain: Aptos Move, Aptos SDK, Aptos REST API
- Lưu trữ: IPFS (Pinata)
- Triển khai: Vercel
- AI: Hugging Face Inference API (để kiểm tra toxicity trong tin nhắn).

Hướng dẫn cài đặt và chạy local
-------------------------------
1. Cài đặt dependencies:
   ```bash
   npm install
   ```
2. Khởi động server phát triển:
   ```bash
   npm run dev
   ```
3. Phát triển smart contract Move:
   ```bash
   aptos move compile
   aptos move test
   ```

Liên hệ và thông tin thêm
-------------------------
- Smart contract: thư mục `contracts/` (Move/Aptos)


Bản quyền và sở hữu trí tuệ
---------------------------
Toàn bộ ý tưởng, thiết kế, mã nguồn và giải pháp kỹ thuật thuộc sở hữu độc quyền của APT - UTC. Nghiêm cấm mọi hành vi sao chép, sử dụng lại hoặc phân phối lại dưới bất kỳ hình thức nào khi chưa có sự đồng ý bằng văn bản của APT - UTC.
