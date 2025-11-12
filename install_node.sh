#!/bin/bash
echo "Đang cài đặt Homebrew..."
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo "Đang cài đặt Node.js..."
brew install node

echo "Kiểm tra phiên bản Node.js..."
node --version
npm --version
