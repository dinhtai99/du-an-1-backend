#!/bin/bash

# Script để đẩy code backend lên repository mới "dự án 1 backend"

echo "🚀 Bắt đầu đẩy code lên repository mới..."

cd /Users/trantai/Desktop/Shop_THB

# Cấu hình git user (nếu chưa có)
git config user.name "dinhtai99" 2>/dev/null || git config --global user.name "dinhtai99"
git config user.email "dinhtai1999t@gmail.com" 2>/dev/null || git config --global user.email "dinhtai1999t@gmail.com"

# Khởi tạo git nếu chưa có
if [ ! -d ".git" ]; then
    echo "📦 Đang khởi tạo git repository..."
    git init
fi

# Thêm tất cả files
echo "➕ Đang thêm files vào git..."
git add .

# Commit đầu tiên
echo "💾 Đang commit..."
git commit -m "Initial commit: Backend code for Shop THB"

# Thêm remote (repository mới)
REPO_NAME="du-an-1-backend"
REPO_URL="https://github.com/dinhtai99/${REPO_NAME}.git"

echo ""
echo "📝 Hướng dẫn tạo repository trên GitHub:"
echo "1. Truy cập: https://github.com/new"
echo "2. Repository name: ${REPO_NAME}"
echo "3. Description: Backend code for Shop THB project"
echo "4. Chọn Public hoặc Private"
echo "5. KHÔNG tích 'Initialize with README'"
echo "6. Click 'Create repository'"
echo ""
read -p "Đã tạo repository trên GitHub chưa? (y/n): " created

if [ "$created" = "y" ] || [ "$created" = "Y" ]; then
    echo ""
    echo "🔗 Đang kết nối với repository..."
    git remote remove origin 2>/dev/null || true
    git remote add origin ${REPO_URL}
    
    echo "⬆️  Đang push code lên GitHub..."
    git branch -M main
    git push -u origin main
    
    echo ""
    echo "✅ Hoàn thành! Code đã được đẩy lên: https://github.com/dinhtai99/${REPO_NAME}"
else
    echo ""
    echo "⚠️  Vui lòng tạo repository trên GitHub trước, sau đó chạy lại script này"
    echo "Hoặc chạy các lệnh sau sau khi tạo repository:"
    echo ""
    echo "git remote add origin ${REPO_URL}"
    echo "git branch -M main"
    echo "git push -u origin main"
fi

