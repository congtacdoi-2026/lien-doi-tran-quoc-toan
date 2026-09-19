# Liên đội - Trường Tiểu học Trần Quốc Toản

Ứng dụng quản lý công tác Đội trực tuyến.

## Nguyên tắc
- Dùng Supabase project mới `lien-doi-tran-quoc-toan`.
- Không kết nối hoặc sử dụng dữ liệu của ứng dụng cũ.
- Không có module điểm danh.
- Publishable key dùng qua biến môi trường; không đưa Secret key/service_role vào trình duyệt.

## Chạy ứng dụng
1. Cài Node.js LTS.
2. Tạo `.env.local` từ `.env.example`.
3. Điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Chạy `npm install`.
5. Chạy `npm run dev`.
