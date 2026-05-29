# Deploy MN_Solution lên GitHub + Vercel

## 1. Kiểm tra local

```bash
npm install
npm run build
```

Nếu build thành công, thư mục `dist/` sẽ được tạo ra.

## 2. Tạo GitHub repository mới

Tạo repository mới trên GitHub, ví dụ:

```txt
mn-solution-online
```

Không cần tạo README trên GitHub nếu source local đã có README.

## 3. Đưa source lên GitHub

Trong thư mục project:

```bash
git init
git add .
git commit -m "initial deploy version"
git branch -M main
git remote add origin https://github.com/USERNAME/mn-solution-online.git
git push -u origin main
```

Đổi `USERNAME` thành tài khoản GitHub của bạn.

## 4. Import sang Vercel

Vào Vercel:

```txt
Add New Project
Import Git Repository
Chọn repository mn-solution-online
```

Cấu hình:

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Bấm Deploy.

## 5. Link sau khi deploy

Vercel sẽ tạo link dạng:

```txt
https://ten-project.vercel.app
```

Có thể gửi link này cho người khác dùng thử.

## 6. Gắn subdomain sau này

Có thể gắn:

```txt
app.mocnguyenclass.vn
```

Trong Vercel:

```txt
Project Settings > Domains > Add Domain
```

Sau đó cấu hình DNS theo hướng dẫn của Vercel.
