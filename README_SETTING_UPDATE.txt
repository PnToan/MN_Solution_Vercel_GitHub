Commit kiểm tra từ file zip hiện tại: 139a42d — Panel_color

File cần thay thế/thêm:
1. src/components/layout/TopBar.vue
2. src/components/layout/AppSettingsDialog.vue
3. src/styles/main.css

Chức năng đã thêm:
- Nút Setting trên top bar.
- Click Setting mở dialog cài đặt chính.
- Dialog style bám theo file mn_plastic_setup.html.
- Layout 2 cột: tab trái 20%, nội dung phải 80%.
- Đã bỏ phần danh sách setting bên phải.
- Đã tạo đủ tab nền tảng:
  + Cài đặt chung
  + Cài đặt Phím tắt
  + Panel
  + Cam chốt
  + Mộng
  + Khoan mồi
  + Chốt đợt
  + Khấu âm dương
  + Bản lề
  + Nẹp dán cạnh
  + Rãnh
  + Tem Nhãn
  + Post processor

Đã test:
- npm run build: PASS
