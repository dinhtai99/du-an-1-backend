#!/bin/bash

# Script để di chuyển code backend vào thư mục backend trong repository Du_an_1

echo "🔄 Đang di chuyển code backend vào thư mục backend..."

cd /Users/trantai/Desktop/Du_an_1

# Tạo thư mục backend nếu chưa có
mkdir -p backend

# Di chuyển các file và thư mục backend vào thư mục backend
echo "📦 Đang di chuyển files..."

# Di chuyển các thư mục
mv controllers backend/ 2>/dev/null || true
mv middleware backend/ 2>/dev/null || true
mv models backend/ 2>/dev/null || true
mv routes backend/ 2>/dev/null || true

# Di chuyển các file
mv server.js backend/ 2>/dev/null || true
mv package.json backend/ 2>/dev/null || true
mv seed.js backend/ 2>/dev/null || true
mv .gitignore backend/ 2>/dev/null || true

# Giữ lại các file hướng dẫn ở root (hoặc xóa nếu muốn)
# mv API_ENDPOINTS.md backend/ 2>/dev/null || true
# mv HUONG_DAN_*.md backend/ 2>/dev/null || true
# mv TAI_KHOAN_*.md backend/ 2>/dev/null || true

echo "✅ Đã di chuyển code vào thư mục backend"
echo ""
echo "📝 Các bước tiếp theo:"
echo "1. Kiểm tra lại: cd /Users/trantai/Desktop/Du_an_1 && ls -la backend/"
echo "2. Commit và push:"
echo "   git add ."
echo "   git commit -m 'Move backend code to backend folder'"
echo "   git push origin main"

