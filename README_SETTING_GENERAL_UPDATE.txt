MN_Solution - Setting General Update
Commit nền: 139a42d — Panel_color

File đã chỉnh:
1. src/components/layout/TopBar.vue
2. src/components/layout/AppSettingsDialog.vue
3. src/app/AppShell.vue
4. src/core/settings/app-settings.js
5. src/renderers/canvas-2d-renderer.js
6. src/styles/main.css

Nội dung:
- Bỏ nút Auto Update trong dialog Setting.
- Tab Cài đặt chung có Font, Chế độ, Màu nền canvas.
- Thêm Load Setting, Nhập Setting, Xuất nesting.
- Setting được lưu bằng localStorage key: MN_Solution_App_Settings.
- AppShell tự load setting khi mở app.
- Renderer canvas lấy màu nền từ biến CSS --mn-bg-canvas.

Test:
- npm run build: PASS.
