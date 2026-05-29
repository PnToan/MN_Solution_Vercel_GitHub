# MN_Solution

MN_Solution là app Vue 3 + Vite dùng cho nền CAD/DAC online.

Bản này đã được chuẩn hóa để đưa lên GitHub + Vercel.

## Yêu cầu môi trường

- Node.js 22.x hoặc mới hơn
- npm 10.x hoặc mới hơn

Kiểm tra:

```bash
node -v
npm -v
```

## Chạy local

```bash
npm install
npm run dev
```

Mở trình duyệt:

```txt
http://localhost:5173
```

## Build production

```bash
npm run build
```

Kết quả build nằm trong:

```txt
dist/
```

## Xem thử bản build

```bash
npm run preview
```

Mở:

```txt
http://localhost:4173
```

## Deploy lên Vercel

Cấu hình trên Vercel:

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

## Ghi chú bảo mật frontend

Bản này đã tắt sourcemap trong `vite.config.js` để tránh lộ source gốc khi deploy online.

Frontend không thể che code tuyệt đối. Các logic quan trọng như đăng nhập, license, database, API xử lý riêng, thuật toán độc quyền nên đưa về backend ở giai đoạn sau.

## File/thư mục không đưa lên GitHub

Các thư mục sau đã nằm trong `.gitignore`:

```txt
node_modules/
dist/
.env
.env.local
*.log
```

## Hướng mở rộng sau này

Định hướng chuẩn:

```txt
app.mocnguyenclass.vn  -> Frontend Vue/Vite trên Vercel
api.mocnguyenclass.vn  -> Backend/API trên VPS hoặc cloud server
Database               -> PostgreSQL/Supabase/VPS
Storage                -> thư viện, template, file xuất
```
