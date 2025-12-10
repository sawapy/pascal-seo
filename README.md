# Pascal SEO - SEOトレンド分析ツール

## 概要

Pascal SEO は、Pascal CSVデータからSEOキーワードの順位変動を視覚化するWebアプリケーションです。

## 主な機能

### 📊 **データ可視化**
- 日次・週次・月次の順位変動グラフ
- 実データ範囲に基づく自動Y軸調整
- 圏外期間の適切な表示

### 📁 **データ管理**
- Pascal CSV一括インポート (Shift-JIS対応)
- 日次ランキングデータの正確な保存
- 重複データの自動上書き処理

### 🔗 **URL共有機能**
- キーワード固有のURL生成
- 直接リンク共有対応
- ブックマーク機能

### 👥 **認証システム**
- Google Workspace認証
- @goodfellows.co.jp ドメイン制限

### 📱 **ユーザー体験**
- 最新順位の一覧表示
- キーワード詳細情報（サイト名、デバイス種別、順位設定）
- レスポンシブデザイン

## 技術スタック

### **フロントエンド**
- React 18 + TypeScript
- Vite (開発サーバー・ビルドツール)
- Tailwind CSS (スタイリング)
- Recharts (グラフ表示)
- React Router DOM (ルーティング)

### **バックエンド**
- Supabase (データベース・認証)
- PostgreSQL (データストレージ)

### **認証**
- Google OAuth 2.0
- Supabase Auth

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数設定
`.env.local`ファイルを作成し、以下を設定：

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Gemini API (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. 開発サーバー起動
```bash
npm run dev
```

### 4. 本番ビルド
```bash
npm run build
```

## データベーススキーマ

### pascal_keywords テーブル
- キーワード基本情報
- Pascal ID、キーワードテキスト、月間検索ボリューム
- サイト情報、デバイス種別、地域設定

### pascal_daily_rankings テーブル  
- 日次順位データ
- 日付、順位、キーワードID

## 使用方法

### 1. **ログイン**
Google Workspace (@goodfellows.co.jp) アカウントでログイン

### 2. **CSVインポート**
Pascal形式のCSVファイル（Shift-JIS）をアップロード

### 3. **データ分析**
- キーワード選択
- 期間設定（全期間・過去3ヶ月・カスタム等）
- グラフ表示形式選択（日次・週次・月次）

### 4. **URL共有**
各キーワードの固有URLをコピーして共有

## 開発者情報

**開発**: Good Fellows Inc.  
**技術サポート**: Claude Code  

## ライセンス

Proprietary - Good Fellows Inc.
