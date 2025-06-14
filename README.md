# APT - UTC: Decentralized Talent Marketplace on Aptos

## Giới thiệu
APT - UTC là nền tảng marketplace phi tập trung tiên phong, được xây dựng trên blockchain Aptos, nhằm kết nối freelancer và khách hàng trong lĩnh vực Web3. Sản phẩm của đội ngũ APT - UTC này tích hợp định danh on-chain, lưu trữ hồ sơ trên IPFS, cơ chế ký quỹ thông minh, và quản lý danh tiếng toàn diện để đảm bảo môi trường làm việc minh bạch và an toàn.

## Tính năng chính
*   **Kết nối ví Aptos:** Xác thực người dùng thông qua định danh phi tập trung (on-chain DID).
*   **Quản lý hồ sơ on-chain:**
    *   Xây dựng và cập nhật hồ sơ cá nhân, lưu trữ trên IPFS.
    *   Lịch sử cập nhật hồ sơ được ghi lại dưới dạng sự kiện on-chain.
    *   Chuyển quyền sở hữu hồ sơ sang ví khác một cách an toàn.
*   **Quản lý Dự án & Thanh toán:**
    *   Đăng dự án với các thông số chi tiết (tiêu đề, mô tả, ngân sách, kỹ năng, thời hạn).
    *   Tìm kiếm và tuyển chọn freelancer, xác thực hồ sơ trực tiếp từ blockchain.
    *   **Cơ chế ký quỹ thông minh:** Quản lý quỹ dự án minh bạch và an toàn thông qua tài khoản ký quỹ do smart contract điều khiển.
    *   **Quản lý cột mốc:** Chia dự án thành các cột mốc với số tiền và thời gian cụ thể.
    *   **Tự động xác nhận cột mốc:** Cơ chế tự động xác nhận sau một khoảng thời gian nhất định nếu không có phản hồi từ khách hàng.
    *   Thanh toán minh bạch và bảo mật cho freelancer thông qua smart contract Move.
    *   Hủy và hoàn thành dự án với logic phân bổ quỹ rõ ràng.
*   **Hệ thống Danh tiếng (Reputation System):**
    *   Tính toán và cập nhật điểm danh tiếng (reputation score) và cấp độ (level) dựa trên các hoạt động on-chain (số dự án hoàn thành, bị hủy, cột mốc được chấp nhận/từ chối, số tiền giao dịch, v.v.).
    *   Cung cấp cái nhìn toàn diện về lịch sử hoạt động và độ tin cậy của người dùng.

## Công nghệ sử dụng
*   **Frontend:** React, Next.js, Tailwind CSS, Framer Motion, Context API, Shadcn UI.
*   **Wallet/Auth:** Aptos Wallet Adapter (Petra).
*   **State Management:** React Context, Custom Hooks.
*   **Blockchain:** Aptos Move (cho Smart Contract), Aptos SDK, Aptos REST API.
*   **Lưu trữ phi tập trung:** IPFS (sử dụng Pinata cho dịch vụ pinning).

## Chi tiết Smart Contract
Các smart contract được triển khai trên Aptos Testnet tại địa chỉ module chính: `0x97bd417572de0bda9b8657459d4863e5d0da70d81000619ddfc8c316408fc853`.

| Module Name         | Resource Name        | Phiên bản | Mô tả                                       |
| :------------------ | :------------------- | :-------- | :------------------------------------------ |
| `job_marketplace_v17` | `Jobs`, `Events`, `MarketplaceCapability` | v17       | Quản lý vòng đời dự án, ứng tuyển, cột mốc, ký quỹ và chuyển tiền. |
| `web3_profiles_v14`   | `ProfileRegistryV14`, `UserReputation`     | v14       | Quản lý hồ sơ người dùng on-chain, DID và hệ thống danh tiếng.   |

## Hướng dẫn cài đặt và chạy local
1.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```
2.  **Khởi động server phát triển:**
    ```bash
    npm run dev
    ```
3.  **Phát triển và triển khai Smart Contract Move:**
    *   Biên dịch và kiểm tra hợp đồng:
        ```bash
        aptos move compile
        aptos move test
        ```
    *   Triển khai hợp đồng (sử dụng địa chỉ module chính đã cập nhật):
        ```bash
        aptos move publish --named-addresses work_board=0x97bd417572de0bda9b8657459d4863e5d0da70d81000619ddfc8c316408fc853 --profile YOUR_PROFILE_NAME --assume-yes
        ```
        *(Thay thế `YOUR_PROFILE_NAME` bằng tên profile Aptos CLI của bạn)*
    *   Khởi tạo marketplace và profile registry (sau khi publish):
        ```bash
        aptos move run --function-id 0x97bd417572de0bda9b8657459d4863e5d0da70d81000619ddfc8c316408fc853::job_marketplace_v17::initialize_marketplace --url https://fullnode.testnet.aptoslabs.com/v1 --profile YOUR_PROFILE_NAME --assume-yes
        aptos move run --function-id 0x97bd417572de0bda9b8657459d4863e5d0da70d81000619ddfc8c316408fc853::web3_profiles_v14::initialize --url https://fullnode.testnet.aptoslabs.com/v1 --profile YOUR_PROFILE_NAME --assume-yes
        ```
        *(Đảm bảo đã có đủ APT trong tài khoản để trả phí gas cho các giao dịch khởi tạo)*

## Liên hệ và thông tin thêm
*   Smart contract: thư mục `contracts/` (Move/Aptos).

## Bản quyền và sở hữu trí tuệ
Toàn bộ ý tưởng, thiết kế, mã nguồn và giải pháp kỹ thuật thuộc sở hữu độc quyền của APT - UTC. Nghiêm cấm mọi hành vi sao chép, sử dụng lại hoặc phân phối lại dưới bất kỳ hình thức nào khi chưa có sự đồng ý bằng văn bản của APT - UTC.
