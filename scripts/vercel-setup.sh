#!/bin/bash
set -e

echo "=== Vercel + GitHub Actions セットアップ ==="
echo ""
echo "このスクリプトは Vercel プロジェクトを作成し、"
echo "GitHub Actions 用のシークレットを表示します。"
echo ""

# Vercel CLI の確認
if ! command -v vercel &> /dev/null; then
  echo "📦 Vercel CLI をインストール中..."
  npm i -g vercel
fi

# Vercel ログイン
echo "🔐 Vercel にログインしてください..."
vercel login

# プロジェクト作成とリンク
echo ""
echo "🔗 Vercel プロジェクトをリンク中..."
vercel link

# 環境変数を Vercel に設定
echo ""
echo "⚙️  環境変数を Vercel に設定中..."

if [ -f ".env.local" ]; then
  # .env.local から各変数を読み込んで vercel env add で設定
  while IFS='=' read -r key value; do
    # コメント行と空行をスキップ
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    echo "  Setting $key..."
    echo "$value" | vercel env add "$key" production --yes 2>/dev/null || true
    echo "$value" | vercel env add "$key" preview --yes 2>/dev/null || true
  done < .env.local
  echo "✅ 環境変数を設定しました"
else
  echo "⚠️  .env.local が見つかりません。先に setup.sh を実行してください"
  exit 1
fi

# GitHub Actions 用のシークレット情報を表示
echo ""
echo "=== GitHub Actions シークレット ==="
echo "以下を GitHub リポジトリの Settings > Secrets > Actions に追加してください:"
echo ""

# vercel.json から project ID を取得
PROJECT_JSON=$(cat .vercel/project.json 2>/dev/null || echo '{}')
ORG_ID=$(echo "$PROJECT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('orgId',''))" 2>/dev/null || echo "")
PROJECT_ID=$(echo "$PROJECT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('projectId',''))" 2>/dev/null || echo "")

echo "VERCEL_TOKEN    → https://vercel.com/account/tokens でトークンを作成"
echo "VERCEL_ORG_ID   → $ORG_ID"
echo "VERCEL_PROJECT_ID → $PROJECT_ID"
echo ""
echo "✅ 完了！次回から main ブランチへのプッシュで自動デプロイされます。"
