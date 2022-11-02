# mf7cli-BBSの生やし方
## 必要なもの
- Replitのアカウント
- Gmail

改造すればReplitやGmailがなくても生やせます。
## 1. Replitリポジトリからフォークする
（GitHubからでもいいけど、
結局Replitのリポジトリを作るので、
Replitからフォークした方がいいと思う（？））

[Replitリポジトリ](https://replit.com/@mf7cli/mf7cli-bbs)

## 2. スレッドを定義する
`data/threads/`に`threads.json`を作って、
作成するスレッドを書き込んでください。

### 例
```json
{
  "threads":[
    "chat1","chat2","game"
  ]
}
```

## 3. ServerConfigを変更する
次はserver_config.jsonを変更します。
```json
{
  "server_name": "mf7cli-BBS",
  "server_domain": "bbs.mf7cli.potp.me",
  "server_port": 3000,
  "public_instance": true,
  
  "admin_user": "mf7cli",
  
  "maintenance": false,
  "config_module": "@replit/database"
}
```
|キー              |内容                                                             |型        |
|-----------------|-----------------------------------------------------------------|---------|
|`server_name`    |サーバーの名前                                                      |`string` |
|`server_domain`  |サーバーのドメイン                                                   |`string` |
|`server_port`    |使用するポート                                                      |`number` |
|`public_instance`|（まだ機能はない）                                                  |`boolean`|
|`admin_user`     |管理者のユーザーID                                                  |`string` |
|`maintenance`    |メンテナンス中かどうか                                               |`boolean`|
|`config_module`  |設定の操作に使用するモジュール（`@replit/database`か`./lib/config.js`）|`string` |

## 4. NPMパッケージをインストールする
インストール: `npm install`

## 5. 環境変数を設定
これが一番面倒です。

[node.js 上の nodemailer で OAuth 2.0 を使って gmail からメールを送る](https://gist.github.com/neguse11/bc09d86e7acbd6442cd4)などを見ながらOAuth2のIDを取得してください。
（これは自分では解説できない）

|キー            |内容                                 |
|---------------|-------------------------------------|
|`client_id`    |GmailのクライアントID                  |
|`client_secret`|Gmailのクライアントシークレット          |
|`mail_address` |Gmailのアドレス（エイリアスは使用できない）|
|`mail_password`|Gmailのパスワード                      |
|`refresh_token`|Gmailのリフレッシュトークン              |

## 6. 起動
`node .`かRunボタンを押せば起動します。