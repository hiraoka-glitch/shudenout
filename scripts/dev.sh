#!/bin/bash

# 🔧 Fail-Fast & Auto-Recovery 開発サーバー自動切替
# Turbopack → Webpack → 診断モード への段階的フォールバック

set -e

# 設定
TIMEOUT_SECONDS=20
PORT_3000=3000
PORT_3001=3001

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 前提チェック
check_prerequisites() {
    echo_info "前提条件をチェック中..."
    
    # Node.js バージョンチェック
    if ! command -v node &> /dev/null; then
        echo_error "Node.js がインストールされていません"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo_error "Node.js 18以上が必要です (現在: $NODE_VERSION)"
        exit 1
    fi
    
    echo_success "Node.js $NODE_VERSION OK"
    
    # 環境変数ファイルチェック
    if [ ! -f ".env.local" ]; then
        echo_warn ".env.local が見つかりません - 一部機能が制限される可能性があります"
    else
        echo_success ".env.local OK"
    fi
    
    # package.json存在チェック
    if [ ! -f "package.json" ]; then
        echo_error "package.json が見つかりません"
        exit 1
    fi
    
    echo_success "前提条件チェック完了"
}

# ポート使用状況チェック
check_port() {
    local port=$1
    if lsof -i :$port &> /dev/null; then
        return 0  # ポートが使用中
    else
        return 1  # ポートが空き
    fi
}

# プロセス終了
kill_existing_processes() {
    echo_info "既存のNext.jsプロセスを終了中..."
    
    # ポート3000と3001で動いているプロセスを終了
    if check_port $PORT_3000; then
        echo_warn "ポート $PORT_3000 が使用中です。プロセスを終了します..."
        lsof -ti :$PORT_3000 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    if check_port $PORT_3001; then
        echo_warn "ポート $PORT_3001 が使用中です。プロセスを終了します..."
        lsof -ti :$PORT_3001 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Next.jsプロセスを名前で検索して終了
    pkill -f "next dev" 2>/dev/null || true
    sleep 1
}

# サーバー起動チェック
wait_for_server() {
    local port=$1
    local timeout=$2
    local start_time=$(date +%s)
    
    echo_info "ポート $port でサーバーの起動を待機中... (timeout: ${timeout}s)"
    
    while true; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            local elapsed=$(($(date +%s) - start_time))
            echo_success "サーバーが起動しました! (${elapsed}s)"
            return 0
        fi
        
        local elapsed=$(($(date +%s) - start_time))
        if [ $elapsed -ge $timeout ]; then
            echo_error "タイムアウト: ${timeout}秒内にサーバーが起動しませんでした"
            return 1
        fi
        
        sleep 2
    done
}

# 1) Turbopack起動試行
try_turbopack() {
    echo_info "🚀 Turbopack で開発サーバーを起動中..."
    
    # Turbopack無効化フラグがある場合はスキップ
    if [ "$NEXT_DISABLE_TURBO" = "true" ]; then
        echo_warn "NEXT_DISABLE_TURBO=true のためTurbopackをスキップします"
        return 1
    fi
    
    # Turbopack起動
    npm run dev > /tmp/next-turbo.log 2>&1 &
    local pid=$!
    
    # 起動チェック
    if wait_for_server $PORT_3000 $TIMEOUT_SECONDS; then
        echo_success "Turbopack 起動成功! PID: $pid"
        echo_info "ログファイル: /tmp/next-turbo.log"
        echo_info "http://localhost:$PORT_3000 でアクセス可能です"
        
        # バックグラウンドで実行中のプロセスを表示
        echo_info "開発サーバーがバックグラウンドで実行中です"
        echo_info "停止するには: kill $pid または Ctrl+C"
        
        # プロセスを待機（フォアグラウンド化）
        wait $pid
        return $?
    else
        echo_error "Turbopack 起動失敗"
        kill $pid 2>/dev/null || true
        
        # ログの最後の部分を表示
        echo_warn "Turbopack エラーログ (最後の10行):"
        tail -10 /tmp/next-turbo.log 2>/dev/null || echo "ログファイルが見つかりません"
        
        return 1
    fi
}

# 2) Webpack起動試行
try_webpack() {
    echo_info "⚙️ Webpack で開発サーバーを起動中..."
    
    # Webpack起動（Turbopack無効化 + 代替ポート）
    npx next dev --no-turbo --port $PORT_3001 > /tmp/next-webpack.log 2>&1 &
    local pid=$!
    
    # 起動チェック
    if wait_for_server $PORT_3001 $TIMEOUT_SECONDS; then
        echo_success "Webpack 起動成功! PID: $pid"
        echo_info "ログファイル: /tmp/next-webpack.log"
        echo_info "http://localhost:$PORT_3001 でアクセス可能です"
        
        echo_info "開発サーバーがバックグラウンドで実行中です"
        echo_info "停止するには: kill $pid または Ctrl+C"
        
        # プロセスを待機（フォアグラウンド化）
        wait $pid
        return $?
    else
        echo_error "Webpack 起動失敗"
        kill $pid 2>/dev/null || true
        
        # ログの最後の部分を表示
        echo_warn "Webpack エラーログ (最後の10行):"
        tail -10 /tmp/next-webpack.log 2>/dev/null || echo "ログファイルが見つかりません"
        
        return 1
    fi
}

# 3) 診断モード
diagnostic_mode() {
    echo_error "🔧 診断モードに移行します..."
    
    echo_info "1) .next ディレクトリを削除中..."
    rm -rf .next
    
    echo_info "2) npm ci で依存関係を再インストール中..."
    npm ci
    
    echo_info "3) TypeScript型チェック実行中..."
    npx tsc --noEmit --skipLibCheck || echo_warn "型エラーが検出されました"
    
    echo_info "4) 診断用Webpack起動..."
    npx next dev --no-turbo --port $PORT_3001 > /tmp/next-diagnostic.log 2>&1 &
    local pid=$!
    
    if wait_for_server $PORT_3001 30; then
        echo_success "診断モードで起動成功! PID: $pid"
        echo_info "ログファイル: /tmp/next-diagnostic.log"
        echo_info "http://localhost:$PORT_3001 でアクセス可能です"
        
        # プロセスを待機
        wait $pid
    else
        echo_error "診断モードでも起動に失敗しました"
        kill $pid 2>/dev/null || true
        
        echo_error "詳細な診断情報:"
        echo "--- Node.js情報 ---"
        node -v
        npm -v
        
        echo "--- package.json の scripts ---"
        cat package.json | jq .scripts 2>/dev/null || echo "jq が利用できません"
        
        echo "--- 最後のエラーログ ---"
        tail -20 /tmp/next-diagnostic.log 2>/dev/null || echo "ログファイルが見つかりません"
        
        exit 1
    fi
}

# シグナルハンドラー（Ctrl+C対応）
cleanup() {
    echo_info "終了シグナルを受信しました。プロセスを終了します..."
    kill_existing_processes
    exit 0
}

trap cleanup SIGINT SIGTERM

# メイン処理
main() {
    echo_info "🏗️ Fail-Fast & Auto-Recovery 開発サーバー起動中..."
    
    # 前提チェック
    check_prerequisites
    
    # 既存プロセス終了
    kill_existing_processes
    
    # 1) Turbopack 試行
    if try_turbopack; then
        return 0
    fi
    
    echo_warn "⚠️ Turbopack 起動失敗 → Webpack へ自動切替"
    
    # 2) Webpack 試行
    if try_webpack; then
        return 0
    fi
    
    echo_error "❌ Webpack 起動失敗 → 診断モードへ自動切替"
    
    # 3) 診断モード
    diagnostic_mode
}

# 実行
main "$@"
