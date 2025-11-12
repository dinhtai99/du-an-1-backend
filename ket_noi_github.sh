#!/bin/bash

# Script để cấu hình git và kết nối với GitHub

echo "🔧 Đang cấu hình git..."

# Cấu hình git user
git config --global user.name "dinhtai99"
git config --global user.email "dinhtai1999t@gmail.com"

echo "✅ Đã cấu hình git user"
echo ""

# Kiểm tra SSH key
echo "🔑 SSH Public Key của bạn:"
echo "----------------------------------------"
cat ~/.ssh/id_rsa.pub
echo "----------------------------------------"
echo ""
echo "📝 Bước tiếp theo:"
echo "1. Copy SSH key ở trên"
echo "2. Truy cập: https://github.com/settings/keys"
echo "3. Click 'New SSH key'"
echo "4. Paste key và lưu"
echo ""
read -p "Đã thêm SSH key vào GitHub chưa? (y/n): " added_key

if [ "$added_key" = "y" ] || [ "$added_key" = "Y" ]; then
    echo ""
    echo "🔍 Đang kiểm tra kết nối GitHub..."
    ssh -T git@github.com
    
    echo ""
    echo "📥 Đang clone repository..."
    cd /Users/trantai/Desktop
    if [ ! -d "Du_an_1" ]; then
        git clone git@github.com:dinhtai99/Du_an_1.git
        echo "✅ Đã clone repository thành công!"
    else
        echo "⚠️  Thư mục Du_an_1 đã tồn tại"
        cd Du_an_1
        git pull origin main
        echo "✅ Đã pull code mới nhất!"
    fi
    
    echo ""
    echo "✅ Hoàn thành! Bây giờ bạn có thể chạy: ./push_to_github.sh"
else
    echo ""
    echo "⚠️  Vui lòng thêm SSH key vào GitHub trước, sau đó chạy lại script này"
fi

