MN_Solution - Shortcut Setting Update
Commit nền: 139a42d — Panel_color

File đã chỉnh/thêm:
1. src/components/layout/AppSettingsDialog.vue
2. src/components/layout/TopBar.vue
3. src/app/AppShell.vue
4. src/core/settings/app-settings.js
5. src/core/settings/shortcut-settings.js
6. src/styles/main.css

Nội dung:
- Tab Cài đặt Phím tắt theo layout: tìm kiếm trên, danh sách chức năng trái, add/assigned phải.
- Liệt kê chức năng thanh công cụ trái: Chọn, Box, Vẽ Tấm, Di chuyển, Dimensions.
- Liệt kê view: Trên, Dưới, Trước, Sau, Trái, Phải.
- Liệt kê ẩn/hiện: Ẩn/Hiện 3D, Ẩn/Hiện Info Panel.
- Liệt kê các chức năng file/top bar: Tạo mới, Lưu offline, Xuất file, Mở Setting.
- Có phím tắt mặc định và cho phép thêm/xóa/reset.
- Lưu phím tắt bằng localStorage key: MN_Solution_Shortcut_Settings.
- Khi xuất/nhập setting chung sẽ kèm shortcut.

Phím mặc định:
- Space: Chọn
- B: Box
- P: Vẽ Tấm
- M: Di chuyển
- D: Dimensions
- Alt+T/B/F/K/L/R: các view
- F3: Ẩn/Hiện 3D
- F4: Ẩn/Hiện Info Panel
- Ctrl+N: Tạo mới
- Ctrl+S: Lưu offline
- Ctrl+E: Xuất file
- F2: Mở Setting

Test:
- npm install --include=optional
- npm run build: PASS
