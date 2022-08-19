# mf7cli-BBSの生やし方
## 必要なもの
- Replitのアカウント
- Gmail

改造すればReplitやGmailがなくても生やせます。
## 1. Replitリポジトリからフォークする
GitHubからでも大丈夫ですが、
結局Replitのリポジトリを作るので、
Replitからフォークした方がいいと思います。

[Replitリポジトリ](https://replit.com/@mf7cli/mf7cli-bbs)

## 2. ServerConfigを変更する
次はserver_config.jsonを変更します。
```json
{
  "server_name": "mf7cli-BBS",
  "server_domain": "bbs.mf7cli.potp.me",
  "server_port": 3000,
  "public_instance": true,
  
  "admin_user": "mf7cli",
  
  "maintenance": false
}
```
|キー              |内容                                             |型        |
|-----------------|-------------------------------------------------|---------|
|`server_name`    |サーバーの名前                                      |`string` |
|`server_domain`  |サーバーのドメイン                                  |`string` |
|`server_port`    |使用するポート                                      |`number` |
|`public_instance`|（まだ機能はない）                                  |`boolean`|
|`admin_user`     |管理者のユーザーID                                  |`string` |
|`maintenance`    |メンテナンス中かどうか                               |`boolean`|

## 3. NPMパッケージをインストールする
インストール: `npm install`

## 4. 環境変数を設定
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

## 5. 起動
`node .`かRunボタンを押せば起動します。


これで生やせました。