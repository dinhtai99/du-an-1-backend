#!/bin/bash

# Script đơn giản để push code lên repository mới

cd /Users/trantai/Desktop/Shop_THB

REPO_NAME="du-an-1-backend"
REPO_URL="https://github.com/dinhtai99/${REPO_NAME}.git"

echo "🔗 Đang kết nối với repository: ${REPO_URL}"

# Xóa remote cũ nếu có
git remote remove origin 2>/dev/null || true

# Thêm remote mới
git remote add origin ${REPO_URL}

echo "⬆️  Đang push code lên GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Hoàn thành! Code đã được đẩy lên:"
    echo "   https://github.com/dinhtai99/${REPO_NAME}"
else
    echo ""
    echo "❌ Lỗi! Vui lòng kiểm tra:"
    echo "1. Đã tạo repository '${REPO_NAME}' trên GitHub chưa?"
    echo "2. Repository URL có đúng không?"
    echo "3. Đã cấu hình SSH key hoặc Personal Access Token chưa?"
fi

