#!/bin/bash

# Script để đẩy code backend lên GitHub repository Du_an_1

echo "🚀 Bắt đầu đẩy code backend lên GitHub..."

# Bước 1: Clone repository (nếu chưa có)
cd /Users/trantai/Desktop
if [ ! -d "Du_an_1" ]; then
    echo "📥 Đang clone repository..."
    git clone https://github.com/dinhtai99/Du_an_1.git
fi

cd Du_an_1

# Bước 2: Pull code mới nhất
echo "📥 Đang pull code mới nhất..."
git pull origin main

# Bước 3: Copy code backend vào thư mục backend
echo "📋 Đang copy code backend..."
cd backend

# Copy các file và thư mục cần thiết
cp -r /Users/trantai/Desktop/Shop_THB/controllers . 2>/dev/null || true
cp -r /Users/trantai/Desktop/Shop_THB/middleware . 2>/dev/null || true
cp -r /Users/trantai/Desktop/Shop_THB/models . 2>/dev/null || true
cp -r /Users/trantai/Desktop/Shop_THB/routes . 2>/dev/null || true
cp /Users/trantai/Desktop/Shop_THB/server.js . 2>/dev/null || true
cp /Users/trantai/Desktop/Shop_THB/package.json . 2>/dev/null || true
cp /Users/trantai/Desktop/Shop_THB/seed.js . 2>/dev/null || true
cp /Users/trantai/Desktop/Shop_THB/API_ENDPOINTS.md . 2>/dev/null || true
cp /Users/trantai/Desktop/Shop_THB/.gitignore . 2>/dev/null || true

# Xóa file .gitkeep nếu có
rm -f .gitkeep 2>/dev/null || true

# Bước 4: Thêm files vào git
cd ..
echo "➕ Đang thêm files vào git..."
git add backend/

# Bước 5: Commit
echo "💾 Đang commit..."
git commit -m "Add backend code to backend folder"

# Bước 6: Push lên GitHub
echo "⬆️  Đang push lên GitHub..."
git push origin main

echo "✅ Hoàn thành! Code backend đã được đẩy lên GitHub."

