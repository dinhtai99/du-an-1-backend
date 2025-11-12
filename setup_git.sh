#!/bin/bash

# Script để cấu hình git và kết nối với GitHub

echo "🔧 Đang cấu hình git..."

# Cấu hình git user (thay đổi thông tin theo của bạn)
read -p "Nhập tên của bạn (cho git): " git_name
read -p "Nhập email GitHub của bạn: " git_email

git config --global user.name "$git_name"
git config --global user.email "$git_email"

echo "✅ Đã cấu hình git user: $git_name <$git_email>"
echo ""
echo "📋 SSH Public Key của bạn:"
cat ~/.ssh/id_rsa.pub
echo ""
echo "📝 Hướng dẫn:"
echo "1. Copy SSH key ở trên"
echo "2. Truy cập: https://github.com/settings/keys"
echo "3. Click 'New SSH key'"
echo "4. Paste key và lưu"
echo ""
echo "Sau đó chạy: ./push_to_github.sh"

