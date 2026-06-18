#!/bin/bash
set -e

echo "=== omoroi-schedule セットアップ ==="

# 1. 依存パッケージのインストール
echo ""
echo "📦 パッケージをインストール中..."
npm install

# 2. .env.local の確認
if [ ! -f ".env.local" ]; then
  echo ""
  echo "⚙️  .env.local が見つかりません。テンプレートからコピーします..."
  cp .env.local.example .env.local
  echo ""
  echo "❗ .env.local を編集して以下を設定してください:"
  echo "   - NEXT_PUBLIC_SUPABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - GOOGLE_CLIENT_ID"
  echo "   - GOOGLE_CLIENT_SECRET"
  echo "   - NEXT_PUBLIC_APP_URL (本番は https://your-domain.vercel.app)"
  echo ""
  read -p "設定が完了したら Enter を押してください..."
fi

# 3. Supabase マイグレーション
echo ""
echo "🗄️  Supabase マイグレーションを実行中..."

if command -v supabase &> /dev/null; then
  supabase db push
  echo "✅ マイグレーション完了"
else
  echo "⚠️  Supabase CLI が見つかりません。"
  echo "   Supabase ダッシュボードの SQL エディタで以下を実行してください:"
  echo "   $(pwd)/supabase/migrations/001_initial.sql"
fi

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "🚀 開発サーバーを起動するには:"
echo "   npm run dev"
echo ""
echo "🌐 アクセス先:"
echo "   トップ: http://localhost:3000"
echo "   管理画面: http://localhost:3000/admin"
