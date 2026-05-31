MN Setting - Panel Update

Commit nền: 139a42d — Panel_color

Các file thay đổi:
1. src/components/layout/AppSettingsDialog.vue
   - Thêm tab Panel hoàn chỉnh.
   - Thêm Độ dày Tấm mặc định = 17.4.
   - Thêm Độ dày Tấm Hậu = 10.
   - Thêm Màu Panel.
   - Thêm Line viền Panel.
   - Thêm Độ Mờ Panel = 80%.
   - Thêm khu mẫu đặt tên panel, có thể click vào text để sửa.

2. src/core/settings/app-settings.js
   - Thêm dữ liệu setting panel vào localStorage.
   - Import/Export/Load Setting đã bao gồm panel.
   - Thêm CSS variables:
     --mn-panel-color
     --mn-panel-selected-line-color
     --mn-panel-opacity
   - Thêm helper getPanelPartName(partKey) để dùng khi sinh panel sau này.

3. src/styles/main.css
   - Thêm style cho phần Panel setting và hình mẫu đặt tên.

Ghi chú:
- Tên panel đã lưu trong localStorage và file json setting.
- Khi sinh panel ở bước sau, lấy tên bằng getPanelPartName(partKey).
