"use strict";

const serverConfig = require('./server_config.json');

const express = require("express");
const multer = require("multer");
const maxSize = 1 * 1000 * 1000;
const upload = multer({
  dest: __dirname + "/tmp",
  limits: {
    fieldNameSize: 100,
    fileSize: maxSize
  }
});
const sharp = require("sharp");
const app = express();
const http = require("node:http");
const server = new http.Server(app);
const fs = require("node:fs");
const bodyParser = require("body-parser");
const DBClient = require("@replit/database");
const cookieparser = require("cookie-parser");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const RssParser = require('rss-parser');
const rssParser = new RssParser();
const rqt = require('./lib/promiseRqt');

// トークン用
const uuidjs = require("uuidjs");

const userManager = require('./lib/userManager');

// メッセージを自動更新するためのやつ
const io = require("socket.io")(server);

// Emailのパターンってこれで大丈夫なん？
const email_pattern = /^[A-Za-z0-9]{1}[A-Za-z0-9+_.-]*@{1}[A-Za-z0-9+_.-]+.[A-Za-z0-9]+$/;
// 大丈夫なのでは( 'ω')

// マークダウンを使用するためのあれ
const md = require("markdown-it")({
  // 改行のあれ
  breaks: true,
  // リンクにするあれ
  linkify: true
}).use(require('markdown-it-highlightjs'));

// 画像のあれ
const check_image_validity = (file_path) => sharp(file_path).toBuffer();

// メール送信のあれ
const auth = {
  type: "OAuth2",
  user: process.env.mail_address, // アドレス
  clientId: process.env.client_id, // Client ID
  clientSecret: process.env.client_secret, // Client Secret
  refreshToken: process.env.refresh_token // Reflesh Token
};

// これは...なんだっけ
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth
});

// テンプレート
const mailOptions = {
  from: "mf7cli-BBS",
  subject: "【重要】アカウント登録の確認"
};

// あとでデータベースに変える
const threads = JSON.parse(fs.readFileSync(__dirname + "/data/threads/threads.json"));

// DBのクライアント
const db = new DBClient();

// なにこれ
// 使われてる
let userlist;

// キューを削除するあれ
setInterval(async () => {
  const val = await db.get("emailauthque")
  if (val === null) {
    db.set("emailauthque", []);
    return;
  }
  val.forEach((value, index) => {
    const limit_date = new Date(val[index].date);
    if (limit_date <= new Date()) {
      val.splice(index, 1);
      db.set("emailauthque", val);
      console.log(val);
      console.log(`キュー${index}の保存期間が切れたため削除しました。`);
    }
  });
}, 30000);

// ユーザーリストを表示
function get_userlist() {
  return db.list("users");
}

// 起動時に欲しい(?)
(async () => {
  console.log(await get_userlist());

  setInterval(() => {
    rssParser.parseURL('https://forest.watch.impress.co.jp/data/rss/1.0/wf/feed.rdf')
      .then((feed) => {
        io.emit("update-rss", feed.items.splice(0, 10));
      })
      .catch((error) => {
        console.error('RSS 取得失敗', error);
      });
  }, 60000);
})();

// ユーザーリストにマッチしたやつ
// findkeyがなければkeyにマッチするやつ
async function userlist_match(list, key, findkey) {
  console.log("探すキー: ", findkey);
  if (findkey) {
    const result = [];
    for (let i = 0; i < list.length; i++) {
      const val = await db.get(list[i]);
      if (val !== null) {
        if (val[key]) {
          if (val[key] === findkey) {
            result[result.length] = val.id;
            console.log("一致したキー: ", val[key]);
          }
        }
      }

      if (i === list.length - 1) {
        console.log(findkey, "の結果: ", result.length);
        return result.length;
      }
    }
  } else {
    const result = [];
    for (let i = 0; i < list.length; i++) {
      console.log(i);
      const val = await db.get(list[i]);
      if (val !== null) {
        if (val[key]) {
          if (val[key] !== undefined && val[key] !== null) {
            result[result.length] = val.id;
            console.log("一致したキー: ", val[key]);
          }
        }
      }

      if (i === list.length - 1) {
        console.log("結果: ", result);
        return result;
      }
    }
  }
}


function isAlphabet(str) {
  str = str ?? "";
  if (str.match(/^[A-Za-z0-9_]+$/)) {
    return true;
  }
  return false;
}

// これは何😟
const messages = {};

// これは最大メッセージ
// いずれ削除
const max_msg = 1000;

// EJSを使用😟
app.set("view engine", "ejs");
// これはreq.bodyのやつ
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// 絶対使う
app.use(cookieparser());
// あれだよ
app.use("/image", express.static(__dirname + "/views/image"));
app.use("/scripts", express.static(__dirname + "/views/scripts"));
app.use("/image/badges", express.static(__dirname + "/views/image/badges"));

// bbs.mf7cli.tkに飛ばすやつ
app.use((req, res, next) => {
  /* リクエストに含まれるHostヘッダーを取得. */
  const hostname = req.headers.host;

  if (hostname === null || hostname === undefined) {
    /*
     * HostヘッダーはHTTP1.1では必須なので
     * ない場合は400にする.
     */
    res.send(400);
    return;
  }

  /*
   * Hostがlocalhostへのアクセスだったらリクエストを処理する.
   * next()を呼ぶことで、下のapp.get()の部分が処理される.
   *
   * Hostがlocalhostへのアクセスで無い場合.
   * 例えば127.0.0.1などIPアドレス直打ちの場合は400を返して終了する.
   * 下のapp.get()は処理されない
   */
  if (hostname.match("mf7cli.potp.me") !== null || hostname.match("mf7cli.potp.me") !== undefined) {
    next();
    return;
  }
  console.log(hostname);
  res.send(`
    <script>
      location.href = "https://bbs.mf7cli.potp.me"
    </script>
  `);
});

// お前まだいたのか(?)
// あとで使う

// app.use((req, res, next) => {
//   if (req.headers['x-forwarded-for']) {
//     console.log(req.headers['x-forwarded-for']);
//   }
//   else if (req.connection && req.connection.remoteAddress) {
//     console.log(req.connection.remoteAddress);
//   }
//   else if (req.connection.socket && req.connection.socket.remoteAddress) {
//     console.log(req.connection.socket.remoteAddress);
//   }
//   else if (req.socket && req.socket.remoteAddress) {
//     console.log(req.socket.remoteAddress);
//   }
// });

app.use((req, res, next) => {
  if (req.originalUrl.slice(0, 6) === '/style' || req.originalUrl.slice(0, 6) === '/image') {
    next();
    return;
  }
  if (require('./server_config.json').maintenance === false) {
    next();
  } else {
    res.render('./maintenance.ejs', {
      serverConfig
    });
  }
});

app.get("/", async (req, res) => {
  const user_id = `users${req.cookies.id}`;

  const val = await db.get(user_id);
  const thread_ = threads.threads.map((val) => ({
    name: val,
    id: val,
  }));

  res.render("./index.ejs", {
    threads: thread_,
    account: val,
    serverConfig
  });
});

// Socket.IOにしない(多分)
app.get("/login", (req, res) => {
  if (req.query.callback) {
    if (!req.query.appName) {
      res.send('URLのパラメータが足りていません。');
      return;
    }
    res.render("./login_callback.ejs", {
      status: "",
      redirect_uri: null,
      query: {
        appName: req.query.appName,
        callback: req.query.callback
      },
      serverConfig
    });

    return;
  }
  res.render("./login.ejs", {
    status: "",
    redirect_uri: null,
    serverConfig
  });
});

// スレッドにもこれがあったほうがいい
app.get("/users/", (req, res) => {
  res.render("./users_page_home.ejs", {
    serverConfig
  });
});

// ユーザーページ
app.get("/users/:user_id/", async (req, res) => {
  let val = await userManager.getUser(req.params.user_id);

  if (!val.error) {
    // res.send(val.id + 'さんのページです。');
    res.render("./users_page.ejs", {
      account: val,
      serverConfig
    });
  } else {
    res.render("./404.ejs", {
      status: req.params.user_id + "さんは存在しません。",
      serverConfig
    });
  }
});

app.get("/remote/users/:user_id/:hostname/", async (req, res) => {
  if (req.params.hostname === serverConfig.server_name) {
    res.redirect(`https://${req.params.hostname}/users/${req.params.user_id}`)
    return;
  }
  let val;
  try {
    val = JSON.parse(await rqt(`https://${req.params.hostname}/api/v1/users/${req.params.user_id}`));
  } catch (e) {
    res.render("./404.ejs", {
      status: `${req.params.hostname}/${req.params.user_id}さんは存在しません。`,
      serverConfig
    });
    return;
  }

  if (val !== null) {
    val.id = `${req.params.hostname}/${val.user_id}`;
    // res.send(val.id + 'さんのページです。');
    res.render("./users_page.ejs", {
      account: val,
      serverConfig
    });
  } else {
    res.render("./404.ejs", {
      status: `${req.params.hostname}/${req.params.user_id}さんは存在しません。`,
      serverConfig
    });
  }
});

// アイコン😟
// imgでリダイレクト😟
app.get("/users/:user_id/icon/", async (req, res) => {
  let val = await userManager.getUser(req.params.user_id);
  if(val.error) console.error(val.error);
  if (val !== null) {
    if (!val.icon) {
      res.redirect("/image/default_icon");
      return;
    }
    if (val.icon.indexOf("http") !== -1) {
      res.redirect(val.icon);
    } else {
      res.sendFile(__dirname + "/views" + val.icon);
    }
  } else {
    res.redirect("/image/default_icon");
  }
});


// あとでパスワードが一致がなんとかかんとか😟
app.get('/api/v1/users/:user_id', async (req, res) => {
  const val = await db.get("users" + req.params.user_id.toLowerCase());
  if (val === null) {
    res.status(404);
    res.json({
      error: req.params.user_id + "さんは存在しません。"
    });
    return;
  }
  res.json({
    user_id: val.id,
    bio: val.bio,
    link: val.link,
    icon: val.icon,
    badge: val.badge
  });
});

app.get("/logout", (req, res) => {
  if (req.cookies.id !== null && req.cookies.password !== null) {
    res.clearCookie("id");
    res.clearCookie("password");
    res.render("./logout.ejs", {
      status: "ログアウトに成功しました",
      serverConfig
    });
  } else {
    res.render("./logout.ejs", {
      status: "ログインしてください",
      serverConfig
    });
  }
});

app.get("/register", (req, res) => {
  res.render("./register.ejs", {
    status: "",
    serverConfig
  });
});

app.get("/settings", async (req, res) => {
  const user_id = `users${req.cookies.id}`;

  const val = await db.get(user_id);
  if (val === null) {
    res.render("./login.ejs", {
      status: "設定を見るにはログインをしてください",
      redirect_uri: null,
      serverConfig
    });
    return;
  }
  if (req.cookies.password !== val.password) {
    res.render("./login.ejs", {
      status: "設定を見るにはログインをしてください",
      redirect_uri: null,
      serverConfig
    });
    return;
  }
  res.render("./settings.ejs", {
    status: "",
    account: val,
    api_key: val.api ? val.api.mf7cli.api_key : "",
    serverConfig
  });
});

app.post("/settings/change_password", (req, res) => {
  const user_id = `users${req.cookies.id}`;
  db.get(user_id).then((val) => {
    if (val !== null) {
      if (
        bcrypt.compareSync(req.body.submit_password, val.password) &&
        req.body.submit_new_password.length >= 5 &&
        !bcrypt.compareSync(req.body.submit_new_password, val.password)
      ) {
        db.set(user_id, {
          id: req.cookies.id,
          password: bcrypt.hashSync(req.body.submit_new_password, 10),
          // あとで直す
          api: val.api,
          email: val.email,
          bio: val.bio,
          link: val.link,
          badge: val.badge,
          icon: val.icon
        });

        console.log(val.id + "がパスワードを変更しました。");
        if (val.api) {
          res.cookie("id", val.id, { httpOnly: false });
          res.cookie("password", req.body.submit_new_password, { httpOnly: false });

          res.render("./settings.ejs", {
            status: "パスワードの変更に成功しました",
            account: val,
            api_key: val.api.mf7cli.api_key,
            serverConfig
          });
        } else {
          res.cookie("id", val.id, { httpOnly: false });
          res.cookie("password", req.body.submit_new_password, { httpOnly: false });

          res.render("./settings.ejs", {
            status: "パスワードの変更に成功しました",
            account: val,
            api_key: "",
            serverConfig
          });
        }
      } else if (req.cookies.password !== val.password && req.body.submit_password === val.password) {
        if (val.api) {
          res.render("./settings.ejs", {
            status: "パスワードが一致しません",
            account: val,
            api_key: val.api.mf7cli.api_key,
            serverConfig
          });
        } else {
          res.render("./settings.ejs", {
            status: "パスワードが一致しません",
            account: val,
            api_key: "",
            serverConfig
          });
        }
      } else if (req.body.submit_new_password === val.password) {
        if (val.api) {
          res.render("./settings.ejs", {
            status: "新しいパスワードは現在のパスワードではないものを指定してください",
            account: val,
            api_key: val.api.mf7cli.api_key,
            serverConfig
          });
        } else {
          res.render("./settings.ejs", {
            status: "新しいパスワードは現在のパスワードではないものを指定してください",
            account: val,
            api_key: "",
            serverConfig
          });
        }
      } else {
        res.render("./settings.ejs", {
          status: "予期しないエラーが発生しました",
          account: val,
          api_key: "",
          serverConfig
        });

        console.log(req.body);
      }
    } else if (val === null) {
      res.render("./login.ejs", {
        status: "ログインしてください",
        redirect_uri: null,
        serverConfig
      });
    }
  });
});

app.post("/settings/change_email", async (req, res) => {
  if (email_pattern.test(req.body.submit_text)) {
    const user_id = `users${req.cookies.id}`;
    const emailAuthQue = await db.get("emailauthque");
    const val = await db.get(user_id);
    if (emailAuthQue !== null && val !== null) {
      if (emailAuthQue.length <= 5 && userlist_match(await get_userlist(), "email", req.body.submit_text) === 0) {
        const date = new Date();

        emailAuthQue[emailAuthQue.length] = {
          email: req.body.submit_text,
          token: uuidjs.generate(),
          date: date.setMinutes(date.getMinutes() + 10),
          id: req.cookies.id,
          password: bcrypt.hashSync(req.cookies.password, 10),
          link_exist: true
        };

        console.log("最新のトークン", emailAuthQue[emailAuthQue.length - 1].token);

        db.set("emailauthque", emailAuthQue).then(() => {
          console.log("登録時のキュー: ", emailAuthQue);
          console.log(req.cookies.id + "がメールアドレスを登録しようとしています。");
          mailOptions.subject = "【重要】アカウントのメールアドレス登録の確認";
          mailOptions.to = req.body.submit_text;
          mailOptions.html = `
          <html>
            <head>
              <link rel="stylesheet" type="text/css" href="https://bbs.mf7cli.tk/style/style.css"/>
              <title>【重要】アカウントのメールアドレス登録の確認</title>
            </head>
            <body>
              <h1>【重要】アカウントのメールアドレス登録の確認</h1>
              あなたのメールアドレスでmf7cli-BBSにアカウントのメールアドレスを登録をしようとしている人がいます。
              <br/>
              もしあなたがアカウント登録をしようとしていたなら、
              <br/>
              以下のリンクからアカウントの確認を行ってください｡
              <br/>
              <a href="https://bbs.mf7cli.potp.me/auth/exist/${emailAuthQue[emailAuthQue.length - 1].token}">認証する</a>
            </body>
          </html>`;

          transporter.sendMail(mailOptions);
          res.render("./login.ejs", {
            status: "確認用メールを送信しました。",
            account: val,
            api_key: "",
            redirect_uri: "/",
            serverConfig
          });
        });
      } else if (userlist_match(await get_userlist(), "email", req.body.submit_text) >= 1) {
        console.log(req.cookies.id + "さんの入力したメールアドレスは既に使用されています。");
        if (val.api) {
          res.render("./register.ejs", {
            status: "入力したメールアドレスは既に使用されています。",
            serverConfig
          });
        } else {
          res.render("./register.ejs", {
            status: "入力したメールアドレスは既に使用されています。",
            serverConfig
          });
        }
      } else if (emailAuthQue.length > 5) {
        console.log(req.cookies.id + "が登録しようとしています。メール認証の最大件数を超えています。");
        if (val.api) {
          res.render("./login.ejs", {
            // status: "登録に成功しました。\nログインしてください。"
            status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
            redirect_uri: "/settings",
            serverConfig
          });
        } else {
          res.render("./login.ejs", {
            // status: "登録に成功しました。\nログインしてください。"
            status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
            redirect_uri: "/settings",
            serverConfig
          });
        }
      } else if (val === null) {
        console.log(req.cookies.id + "さん、予期しないエラーが発生しました。");
        res.render("./login.ejs", {
          status: "予期しないエラーが発生しました。もう一度ログインしてください。",
          redirect_uri: "/settings",
          serverConfig
        });
      }
      else {
        res.render("./login.ejs", {
          status: "予期しないエラーが発生しました。",
          account: val,
          api_key: "",
          serverConfig
        });
      }
    } else {
      console.log(req.cookies.id + "さん、予期しないエラーが発生しました。");
      res.render("./login.ejs", {
        status: "予期しないエラーが発生しました。もう一度ログインしてください。",
        redirect_uri: "",
        serverConfig
      });
    }
  } else {
    console.log(req.cookies.id + "さん、正しいメールアドレスを入力してください。");
    if (val.api) {
      res.render("./settings.ejs", {
        status: "正しいメールアドレスを入力してください。",
        account: val,
        api_key: val.api.mf7cli.api_key,
        serverConfig
      });
    } else {
      res.render("./settings.ejs", {
        status: "正しいメールアドレスを入力してください。",
        account: val,
        api_key: "",
        serverConfig
      });
    }
  }
});

app.get("/auth/:token", async (req, res) => {
  const val = await db.get("emailauthque");
  if (val === null) {
    console.log(
      checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。"
    );
    res.render("./auth.ejs", {
      status: "予期せぬエラーが発生しました。",
      account: checkToken()[checkToken().length - 1],
      serverConfig
    });
    return;
  }
  const checkToken = () => {
    const result = [];
    for (let i = 0; i <= val.length - 1; i++) {
      console.log(i);
      console.log("auth_data_value: ", val[i]);
      if (val[i].token === req.params.token) {
        result[result.length] = val[i];
      }
      if (i === val.length - 1) {
        return result;
      }
    }
  };

  console.log(val[checkToken().length - 1]);

  if (checkToken().length < 1) {
    console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
    res.render("./register.ejs", {
      status: "Tokenが存在しなかったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。",
      serverConfig
    });
    return;
  }
  if (val[checkToken().length - 1].link_exist === false) {
    console.log("誰かがメールアドレス認証の画面にきたよ");
    res.render("./auth.ejs", {
      status: "",
      account: checkToken()[checkToken().length - 1],
      serverConfig
    });
  } else {
    console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
    res.render("./register.ejs", {
      status:
        "Tokenが新規登録用の物だったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。",
      serverConfig
    });
  }
});

app.get("/auth/exist/:token", (req, res) => {
  db.get("emailauthque").then((val) => {
    if (val !== null) {
      if (val.link_exist === false) return;
      const checkToken = function checkToken() {
        const result = [];
        for (let i = 0; i <= val.length - 1; i++) {
          console.log(i);
          console.log("auth_data_value: ", val[i]);
          if (val[i].token === req.params.token) {
            result[result.length] = val[i];
          }
          if (i === val.length - 1) {
            return result;
          }
        }
      };
      console.log("一致したトークンの数: ", checkToken().length);
      if (checkToken().length >= 1) {
        console.log("誰かがメールアドレス認証の画面にきたよ");
        res.render("./auth_exist.ejs", {
          status: "",
          account: checkToken()[checkToken().length - 1],
          serverConfig
        });
      } else {
        console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
        res.render("./register.ejs", {
          status: "Tokenが存在しなかったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。",
          serverConfig
        });
      }
    } else {
      console.log(
        checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。"
      );
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1],
        serverConfig
      });
    }
  });
});

app.post("/auth/exist/:token/auth", (req, res) => {
  db.get("emailauthque").then((val) => {
    const checkToken = function checkToken() {
      const result = [];
      for (let i = 0; i <= val.length - 1; i++) {
        console.log(i);
        console.log("auth_data_value: ", val[i]);
        if (val[i].token === req.params.token) {
          result[result.length] = val[i];
        }
        if (i === val.length - 1) {
          return result;
        }
      }
    };
    if (val !== null) {
      if (bcrypt.compareSync(req.body.submit_password, checkToken()[checkToken().length - 1].password)) {
        if (checkToken()[checkToken().length - 1].api) {
          db.set(`users${checkToken()[checkToken().length - 1].id}`, {
            id: checkToken()[checkToken().length - 1].id,
            password: checkToken()[checkToken().length - 1].password,
            api: checkToken()[checkToken().length - 1].api,
            email: checkToken()[checkToken().length - 1].email,
            bio: checkToken()[checkToken().length - 1].bio,
            link: checkToken()[checkToken().length - 1].link,
            badge: checkToken()[checkToken().length - 1].badge
          });
          res.render("./login.ejs", {
            status: "メールアドレスの登録が完了しました。",
            redirect_uri: "/",
            serverConfig
          });
        } else {
          let { badge } = checkToken()[checkToken().length - 1];
          if (!badge) badge = [];
          if (badge.indexOf("メールアドレス登録者") === 1) {
            badge[badge.length] = "メールアドレス登録者";
          }

          db.set(`users${checkToken()[checkToken().length - 1].id}`, {
            id: checkToken()[checkToken().length - 1].id,
            password: checkToken()[checkToken().length - 1].password,
            api: {
              mf7cli: {
                api_key: ""
              }
            },
            email: checkToken()[checkToken().length - 1].email,
            bio: checkToken()[checkToken().length - 1].bio,
            link: checkToken()[checkToken().length - 1].link,
            badge,
            icon: checkToken()[checkToken().length - 1].icon
          });
          res.render("./login.ejs", {
            status: "メールアドレスの登録が完了しました。",
            redirect_uri: "/",
            serverConfig
          });
        }
      } else {
        console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。パスワードが違うみたいだね。");
        res.render("./auth.ejs", {
          status: "入力したパスワードと仮登録で使用したパスワードが一致しません。",
          account: checkToken()[checkToken().length - 1],
          serverConfig
        });
      }
    } else {
      console.log(
        checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。"
      );
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1],
        serverConfig
      });
    }
  });
});

app.post("/auth/:token/auth", (req, res) => {
  db.get("emailauthque").then(async (val) => {
    function checkToken() {
      const result = [];
      for (let i = 0; i <= val.length - 1; i++) {
        console.log(i);
        console.log("auth_data_value: ", val[i]);
        if (val[i].token === req.params.token) {
          result[result.length] = val[i];
        }
        if (i === val.length - 1) {
          return result;
        }
      }
    }
    if (val !== null && (await userlist_match(await get_userlist(), "id", checkToken()[checkToken().length - 1].email)) === 0) {
      if (bcrypt.compareSync(req.body.submit_password, checkToken()[checkToken().length - 1].password)) {
        db.set(`users${checkToken()[checkToken().length - 1].id}`, {
          id: checkToken()[checkToken().length - 1].id,
          password: checkToken()[checkToken().length - 1].password,
          email: checkToken()[checkToken().length - 1].email,
          bio: checkToken()[checkToken().length - 1].bio,
          link: checkToken()[checkToken().length - 1].link,
          badge: ["メールアドレス登録者"],
          icon: checkToken()[checkToken().length - 1].icon
        });
        res.render("./login.ejs", {
          status: "登録が完了しました。ログインしてください。",
          redirect_uri: null,
          serverConfig
        });
      } else {
        console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。パスワードが違うみたいだね。");
        res.render("./auth.ejs", {
          status: "入力したパスワードと仮登録で使用したパスワードが一致しません。",
          account: checkToken()[checkToken().length - 1],
          serverConfig
        });
      }
    } else if ((await userlist_match(await get_userlist(), "id", checkToken()[checkToken().length - 1].id)) !== 0) {
      console.log("a: ", checkToken()[checkToken().length - 1].id);

      res.render("./auth.ejs", {
        status: checkToken()[checkToken().length - 1].id + "は存在します。",
        account: checkToken()[checkToken().length - 1],
        serverConfig
      });
    } else {
      console.log(
        checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。"
      );
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1],
        serverConfig
      });
    }
  });
});

app.post('/api/v1/getHash', (req, res) => {
  const user_id = `users${req.body.submit_id[0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    if (val !== null && req.body.submit_id[0].length >= 5) {
      if (bcrypt.compareSync(req.body.submit_id[1], val.password)) {
        console.log(req.body.submit_id[0] + "がAPIで自身のユーザーデータを比較しました");
        res.json({
          status: 0,
          message: 'Password matched.',
          hash: val.password
        });
      }
      else {
        res.json({
          status: -1,
          message: 'Passwords do not match.'
        });
      }
    }
    else {
      res.json({
        status: -2,
        message: 'User does not exist.'
      });
    }
  });
});

app.post('/api/v1/compare', (req, res) => {
  const user_id = `users${req.body.submit_id[0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    if (val !== null && req.body.submit_id[0].length >= 5) {
      if (req.body.submit_id[1] === val.password) {
        console.log(req.body.submit_id[0] + "がAPIで自身のユーザーデータを比較しました");
        res.json({
          status: 0,
          message: 'Password matched.'
        });
      }
      else {
        res.json({
          status: -1,
          message: 'Passwords do not match.'
        });
      }
    }
    else {
      res.json({
        status: -2,
        message: 'User does not exist.'
      });
    }
  });
});

app.post('/api/v1/user/data/get', (req, res) => {
  const user_id = `users${req.body.submit_id[0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    if (val !== null && req.body.submit_id[0].length >= 5) {
      if (req.body.submit_id[1] === val.password) {
        console.log(req.body.submit_id[0] + "がAPIで自身のユーザーデータにuser_dataを追加しました");

        const Conf = require('conf');

        const config = new Conf();

        res.json({
          status: 0,
          message: 'Password matched.',
          data: config.get(req.body.data.name)
        });
      } else {
        res.json({
          status: -1,
          message: 'Passwords do not match.'
        });
      }
    } else {
      res.json({
        status: -2,
        message: 'User does not exist.'
      });
    }
  });
});

app.post('/api/v1/user/data/add', (req, res) => {
  const user_id = `users${req.body.submit_id[0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    if (val !== null && req.body.submit_id[0].length >= 5) {
      if (req.body.submit_id[1] === val.password) {
        console.log(req.body.submit_id[0] + "がAPIで自身のユーザーデータにuser_dataを追加しました");
        let path = req.body.data.name.split('.');

        const Conf = require('conf');

        const config = new Conf();

        config.set(req.body.data.name, req.body.data.data);

        if (!val.user_data) val.user_data = {};
        val.user_data[path[0]] = config.get(path[0]);

        res.json({
          status: 0,
          message: 'Password matched.',
          data: config.get(path[0])
        });

        db.set(user_id, val);
      }
      else {
        res.json({
          status: -1,
          message: 'Passwords do not match.'
        });
      }
    }
    else {
      res.json({
        status: -2,
        message: 'User does not exist.'
      });
    }
  });
});

app.post('/api/v1/user/data/delete', (req, res) => {
  const user_id = `users${req.body.submit_id[0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    if (val !== null && req.body.submit_id[0].length >= 5) {
      if (req.body.submit_id[1] === val.password) {
        console.log(req.body.submit_id[0] + "がAPIで自身のユーザーデータにuser_dataを追加しました");
        let path = req.body.data.name.split('.');

        const Conf = require('conf');

        const config = new Conf();

        config.delete(req.body.data.name);

        if (!val.user_data) val.user_data = {};
        val.user_data[path[0]] = config.get(path[0]);

        res.json({
          status: 0,
          message: 'Password matched.',
          data: config.get(path[0])
        });

        db.set(user_id, val);
      }
      else {
        res.json({
          status: -1,
          message: 'Passwords do not match.'
        });
      }
    }
    else {
      res.json({
        status: -2,
        message: 'User does not exist.'
      });
    }
  });
});

app.post("/login", (req, res) => {
  const user_id = `users${req.body.submit_id[0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    if (val !== null && req.body.submit_id[0].length >= 5) {
      if (bcrypt.compareSync(req.body.submit_id[1], val.password)) {
        console.log(req.body.submit_id[0] + "がログインしました");
        res.cookie("id", req.body.submit_id[0].toLowerCase(), {
          maxAge: 3e9,
          httpOnly: false
        });
        res.cookie("password", val.password, {
          maxAge: 3e9,
          httpOnly: false
        });
        res.render("./login.ejs", {
          status: "ログインに成功しました。",
          redirect_uri: "/",
          serverConfig
        });
      } else {
        console.log(req.body.submit_id[0] + 'がログインに失敗しました。パスワードがDBのパスワードと一致しません。"');
        res.render("./login.ejs", {
          status: "ログインに失敗しました。パスワードがDBのパスワードと一致しません。",
          redirect_uri: null,
          serverConfig
        });
      }
    } else {
      console.log(req.body.submit_id[0] + "は存在しません");
      res.render("./login.ejs", {
        status: "ユーザーが存在しません。",
        redirect_uri: null,
        serverConfig
      });
    }
  });
});

app.post("/login_callback", (req, res) => {
  const user_id = `users${req.body.submit_id[0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    if (val !== null && req.body.submit_id[0].length >= 5) {
      if (bcrypt.compareSync(req.body.submit_id[1], val.password)) {
        console.log(req.body.submit_id[0] + "がログインしました");
        res.cookie("id", req.body.submit_id[0].toLowerCase(), {
          maxAge: 3e9,
          httpOnly: false
        });
        res.cookie("password", val.password, {
          maxAge: 3e9,
          httpOnly: false
        });
        // res.render("./login.ejs", {
        //   status: "ログインに成功しました。",
        //   redirect_uri: `${req.body.callback}?user=${val.id}&password=${val.password}`
        // });
        res.send(`<script>location.href = '${req.body.callback}?user=${val.id}&password=${val.password}';</script>`)
      } else {
        console.log(req.body.submit_id[0] + 'がログインに失敗しました。パスワードがDBのパスワードと一致しません。"');
        res.render("./login.ejs", {
          status: "ログインに失敗しました。パスワードがDBのパスワードと一致しません。",
          redirect_uri: '/',
          serverConfig
        });
      }
    } else {
      console.log(req.body.submit_id[0] + "は存在しません");
      res.render("./login.ejs", {
        status: "ユーザーが存在しません。",
        redirect_uri: '/',
        serverConfig
      });
    }
  });
});

app.post("/register", (req, res) => {
  console.log(req.body.submit_id[0]);
  const user_id = `users${req.body.submit_id[0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    db.list("users").then(async (matches) => {
      userlist = matches;
      console.log(userlist);

      if (
        val === null &&
        req.body.submit_id[0].length >= 5 &&
        req.body.submit_id[1].length >= 8 &&
        isAlphabet(req.body.submit_id[0]) &&
        req.body.submit_id[0].length <= 15 &&
        req.body.submit_id[2] &&
        email_pattern.test(req.body.submit_id[2]) &&
        (await userlist_match(userlist, "email", req.body.submit_id[2])) === 0 &&
        (await userlist_match(userlist, "id", req.body.submit_id[0])) === 0
      ) {
        console.log("一致したメールアドレス: ", await userlist_match(await get_userlist(), "email", req.body.submit_id[2]));
        let emailAuthQue = await db.get("emailauthque");
        if (emailAuthQue !== null) {
          console.log(emailAuthQue);
          if (emailAuthQue.length <= 5) {
            const date = new Date();
            emailAuthQue[emailAuthQue.length] = {
              email: req.body.submit_id[2],
              token: uuidjs.generate(),
              date: date.setMinutes(date.getMinutes() + 10),
              id: req.body.submit_id[0],
              password: bcrypt.hashSync(req.body.submit_id[1], 10),
              link_exist: false,
              ip: req.ip
            };

            // oauth2Client.setCredentials({
            //  refresh_token: process.env.refresh_token
            // });

            // const accessToken = oauth2Client.getAccessToken();

            // const transporter = nodemailer.createTransport({
            //   service: 'gmail',
            //   auth: {
            //     type: 'OAuth2',
            //     user: process.env.mail_address,
            //     pass: process.env.mail_password,
            //     clientSecret: process.env.client_secret,
            //     refresh_token: process.env.refresh_token,
            //     access_token: accessToken
            //   }
            // });

            db.set("emailauthque", emailAuthQue).then(() => {
              console.log(req.body.submit_id[0] + "が登録しようとしています");
            });
            mailOptions.subject = "【重要】アカウント登録の確認";
            mailOptions.to = req.body.submit_id[2];
            mailOptions.html = `
            <html>
              <head>
                <link rel="stylesheet" type="text/css" href="https://bbs.mf7cli.tk/style/style.css"/>
                <title>【重要】アカウント登録の確認</title>
              </head>
              <body>
                <h1>【重要】アカウント登録の確認</h1>
                あなたのメールアドレスでmf7cli-BBSにアカウント登録をしようとしている人がいます。
                <br/>
                もしあなたがアカウント登録をしようとしていたなら、
                <br/>
                以下のリンクからアカウントの確認を行ってください｡
                <br/>
                <a href="https://bbs.mf7cli.potp.me/auth/${emailAuthQue[emailAuthQue.length - 1].token}">認証する</a>
              </body>
            </html>`;
            transporter.sendMail(mailOptions);
            console.log(req.body.submit_id[0] + "が登録しようとしています");
            res.render("./login.ejs", {
              status: "確認用メールを送信しました。",
              redirect_uri: "/",
              serverConfig
            });
          } else {
            console.log(
              req.body.submit_id[0] +
              "が登録しようとしています。現在メール認証の最大件数を超えているためメールを送信できませんでした。"
            );
            res.render("./login.ejs", {
              // status: "登録に成功しました。\nログインしてください。"
              status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
              redirect_uri: "/",
              serverConfig
            });
          }
        } else {
          emailAuthQue = [];
          emailAuthQue[emailAuthQue.length] = {
            email: req.body.submit_id[2],
            token: uuidjs.generate(),
            date: new Date(),
            id: req.body.submit_id[0],
            password: bcrypt.hashSync(req.body.submit_id[1], 10),
            link_exist: false
          };

          // oauth2Client.setCredentials({
          //  refresh_token: process.env.refresh_token
          // });

          // const accessToken = oauth2Client.getAccessToken();

          // const transporter = nodemailer.createTransport({
          //   service: 'Gmail',
          //   port: 465,
          //   secure: true,
          //   auth: {
          //     type: 'OAuth2',
          //     user: process.env.mail_address,
          //     pass: process.env.mail_password,
          //     clientSecret: process.env.client_secret,
          //     refresh_token: process.env.refresh_token,
          //     access_token: accessToken
          //   }
          // });

          db.set("emailauthque", emailAuthQue).then(() => {
            console.log(req.body.submit_id[0] + "が登録しようとしています");
            res.render("./login.ejs", {
              // status: "登録に成功しました。\nログインしてください。"
              status: "確認用メールを送信しました。",
              redirect_uri: "/",
              serverConfig
            });
          });

          mailOptions.to = req.body.submit_id[2];
          mailOptions.html = `
          <html>
            <head>
              <link rel="stylesheet" type="text/css" href="https://bbs.mf7cli.tk/style/style.css"/>
              <title>【重要】アカウント登録の確認</title>
            </head>
            <body>
              <h1>【重要】アカウント登録の確認</h1>
              あなたのメールアドレスでmf7cli-BBSにアカウント登録をしようとしている人がいます。
              <br/>
              もしあなたがアカウント登録をしようとしていたなら、
              <br/>
              以下のリンクからアカウントの確認を行ってください｡
              <br/>
              <a href="https://bbs.mf7cli.potp.me/auth/${emailAuthQue[emailAuthQue.length - 1].token}">認証する</a>
            </body>
          </html>`;
          transporter.sendMail(mailOptions);
          console.log(req.body.submit_id[0] + "が登録しようとしています");
          res.render("./login.ejs", {
            status: "確認用メールを送信しました。",
            redirect_uri: "/",
            serverConfig
          });
          // db.set(user_id, {
          //   id: req.body["submit_id"][0],
          //   password: bcrypt.hashSync(req.body["submit_id"][1], 10)
          // }).then(() => { });

          // console.log(req.body["submit_id"][0] + 'が登録しました');
        }
      } else if (val !== null) {
        console.log(req.body.submit_id[0] + "は存在します");
        res.render("./register.ejs", {
          status: req.body.submit_id[0] + "は存在します。別の名前を指定してください。",
          serverConfig
        });
      } else if (req.body.submit_id[0].length < 5 || req.body.submit_id[1].length < 8 || req.body.submit_id[0].length > 15) {
        console.log(req.body.submit_id[0] + "さん、要件を満たしていません。");
        res.render("./register.ejs", {
          status: "パスワードかIDが要件を満たしていません。",
          serverConfig
        });
      } else if (!req.body.submit_id[2] || !email_pattern.test(req.body.submit_id[2])) {
        console.log(req.body.submit_id[0] + "さん、要件を満たしていません。");
        res.render("./register.ejs", {
          status: "正しいメールアドレスを入力してください。",
          serverConfig
        });
      } else if ((await userlist_match(userlist, "email", req.body.submit_id[2])) !== 0) {
        console.log(req.body.submit_id[0] + "さんの入力したメールアドレスは既に使用されています。");
        console.log("リスト: ", userlist, "\n結果: ", await userlist_match(userlist, "email", req.body.submit_id[2]));
        res.render("./register.ejs", {
          status: "入力したメールアドレスは既に使用されています。",
          serverConfig
        });
      } else if ((await userlist_match(userlist, "id", req.body.submit_id[0])) !== 0) {
        console.log(req.body.submit_id[0] + "さんの入力したIDは既に使用されています。");
        res.render("./register.ejs", {
          status: "入力したIDは既に使用されています。",
          serverConfig
        });
      }
    });
  });
});

app.get("/api/v1/thread/", (req, res) => {
  res.json({
    threads: threads.threads
  });
});

app.post("/api/v1/thread/", (req, res) => {
  res.json({
    threads: threads.threads
  });
});

app.get('/api/v1/thread_list', (req, res) => {
  const thread_ = threads.threads.map((val) => ({
    name: val,
    id: val,
  }));

  res.json({
    threads: thread_
  });
});

// スレッド一覧を取得
threads.threads.forEach((val) => {
  // const db_id = `messages${val}`;
  // db.get(db_id).then(keys => {
  //   if (keys === null) {
  //     keys = {message:[]};
  //     keys["message"][0] = { id: 'system', text: `ここは${val}です。`, pinned: true };
  //   }
  //   messages[val] = keys;
  //   console.log(messages);

  //   db.set(db_id, messages[val]).then(() => {
  //   });
  // });

  app.all(`/api/v1/thread/${val}`, async (req, res) => {
    const db_id = `messages${val}`;
    let messages_db = await db.get(db_id);
    if (messages_db === null || messages_db === undefined) {
      messages_db = { message: [] };
      messages_db.message[0] = { id: "system", text: `ここは${val}です。`, pinned: true };
    }

    messages[val] = messages_db;
    db.set(db_id, messages[val]);
    
    let start_length = req.query.start;
    let load_length = req.query.length;
    

    if (load_length === 'max') {
      load_length = messages[val].message.length;
    }

    if (typeof start_length !== 'number' && req.query.start) {
      start_length = Number(start_length);
    }
    if (typeof load_length !== 'number' && req.query.start) {
      load_length = Number(load_length);
    }
    
    if (typeof start_length !== 'number' && !req.query.start) {
      start_length = 0;
    }
    
    if (typeof load_length !== 'number' && !req.query.length) {
      load_length = 10;
      if (messages[val].message.length - 1 < 10) {
        load_length = messages[val].message.length - 1;
      }
    }

    if (start_length > messages[val].message.length - 1) {
      start_length = messages[val].message.length - 1;
    }

    if (load_length > messages[val].message.length) {
      load_length = messages[val].message.length;
    }

    for (let i = start_length; i < start_length + load_length; i++) {
      try {
        messages[val].message[i].text = md.render(String(messages[val].message[i].text));
      } catch (e) {
        messages[val].message[i].text = '(このメッセージはStringではない型のメッセージです。)';
      }
    }

    res.json(messages[val].message.splice(-start_length, load_length));
  });


  app.get(`/thread/${val}`, async (req, res) => {
    // 初期化
    const db_id = `messages${val}`;

    // Source by https://qiita.com/saekis/items/c2b41cd8940923863791
    // function escape_html (string) {
    //   if(typeof string !== 'string') {
    //     return string;
    //   }
    //   return string.replace(/[&'`"<>]/g, function(match) {
    //     return {
    //       '&': '&amp;',
    //       "'": '&#x27;',
    //       '`': '&#x60;',
    //       '"': '&quot;',
    //       '<': '&lt;',
    //       '>': '&gt;',
    //     }[match]
    //   });
    // }

    const account = await db.get(`users${req.cookies.id}`);

    const messages_db = await db.get(db_id);
    if (messages_db !== null && messages_db !== undefined) {

      res.render("./thread.ejs", {
        thread: { name: val, id: val },
        message: [],
        msg_length: 0,
        status: "",
        md,
        db,
        account,
        cookies: req.cookies,
        users_data: {
          icon: []
        },
        serverConfig
      });
    } else {
      messages[val] = { message: [] };
      messages[val].message[0] = { id: "system", text: `ここは${val}です。`, pinned: true };

      console.log(messages);

      res.render("./thread.ejs", {
        thread: { name: val, id: val },
        message: [],
        msg_length: 0,
        status: "",
        md,
        db,
        account,
        cookies: req.cookies,
        users_data: {
          icon: []
        },
        serverConfig
      });
    }
  });

  app.get(`/thread/2/${val}`, async (req, res) => {
    // 初期化
    const db_id = `messages${val}`;

    // Source by https://qiita.com/saekis/items/c2b41cd8940923863791
    // function escape_html (string) {
    //   if(typeof string !== 'string') {
    //     return string;
    //   }
    //   return string.replace(/[&'`"<>]/g, function(match) {
    //     return {
    //       '&': '&amp;',
    //       "'": '&#x27;',
    //       '`': '&#x60;',
    //       '"': '&quot;',
    //       '<': '&lt;',
    //       '>': '&gt;',
    //     }[match]
    //   });
    // }

    const account = await db.get(`users${req.cookies.id}`);

    const messages_db = await db.get(db_id);
    if (messages_db !== null && messages_db !== undefined) {

      res.render("./thread_new_ui.ejs", {
        thread: { name: val, id: val },
        message: [],
        msg_length: 0,
        status: "",
        md,
        db,
        account,
        cookies: req.cookies,
        users_data: {
          icon: []
        },
        serverConfig
      });
    } else {
      messages[val] = { message: [] };
      messages[val].message[0] = { id: "system", text: `ここは${val}です。`, pinned: true };

      console.log(messages);

      res.render("./thread.ejs", {
        thread: { name: val, id: val },
        message: [],
        msg_length: 0,
        status: "",
        md,
        db,
        account,
        cookies: req.cookies,
        users_data: {
          icon: []
        },
        serverConfig
      });
    }
  });
});

app.get("/style/style.css", (req, res) => {
  res.sendFile(__dirname + "/views/style/style.css");
});

app.get("/style/style_v2.css", (req, res) => {
  res.sendFile(__dirname + "/views/style/style_v2.css");
});

app.get("/image/default_icon", (req, res) => {
  res.sendFile(__dirname + "/views/image/default_icon.jpeg");
});

app.get("/tos", (req, res) => {
  res.sendFile(__dirname + "/views/tos.html");
});

app.get("/about", (req, res) => {
  res.sendFile(__dirname + "/views/about.html");
});

app.get("/image/logo_circle", (req, res) => {
  res.sendFile(__dirname + "/views/image/mf7cli-BBS_0520011046.png");
});

app.get("/image/logo", (req, res) => {
  res.sendFile(__dirname + "/views/image/mf7cli-BBS.png");
});

app.get("/new_ui", (req, res) => {
  res.render("new_ui/index.ejs", {});
});

app.get("/style/style_new_ui.css", (req, res) => {
  res.sendFile(__dirname + "/views/style/style_new_ui.css");
});

app.get("/favicon.ico", (req, res) => {
  res.sendFile(__dirname + "/views/favicon.ico");
});

app.get("/favicon_notify.ico", (req, res) => {
  res.sendFile(__dirname + "/views/favicon_notify.ico");
});

app.get("/image/logo/matterhorn", (req, res) => {
  res.sendFile(__dirname + "/views/image/matterhorn_icon.png");
});

app.get("/settings/profile", (req, res) => {
  const user_id = `users${req.cookies.id}`;

  db.get(user_id).then((val) => {
    if (val !== null) {
      if (req.cookies.password !== val.password) {
        res.render("./login.ejs", {
          status: "設定を見るにはログインをしてください",
          redirect_uri: null,
          serverConfig
        });
      } else {
        res.render("./settings_profile.ejs", {
          status: "",
          account: val,
          serverConfig
        });
      }
    } else {
      res.render("./login.ejs", {
        status: "設定を見るにはログインをしてください",
        redirect_uri: null,
        serverConfig
      });
    }
  });
});

app.post("/settings/profile/set_bio", async (req, res) => {
  const user_id = `users${req.cookies.id}`;

  const val = await db.get(user_id);
  if (val === null) return;
  if (req.cookies.password !== val.password) {
    res.render("./login.ejs", {
      status: "設定を見るにはログインをしてください",
      redirect_uri: null,
      serverConfig
    });
    return;
  }
  console.log(req.body.submit_text);
  await db.set(`users${val.id}`, {
    id: val.id,
    password: val.password,
    email: val.email,
    bio: req.body.submit_text,
    link: val.link,
    badge: val.badge,
    icon: val.icon,
    intents: val.intents
  });
  res.render("./settings_profile.ejs", {
    status: "",
    account: val,
    serverConfig
  });
});

app.post("/settings/profile/set_link", (req, res) => {
  const user_id = `users${req.cookies.id}`;

  db.get(user_id).then((val) => {
    if (val !== null) {
      if (req.cookies.password !== val.password) {
        res.render("./login.ejs", {
          status: "設定を見るにはログインをしてください",
          redirect_uri: null,
          serverConfig
        });
      } else {
        console.log(req.body.submit_text);
        if (req.body.submit_text.slice(-1) === /,|\n/) req.body.submit_text.slice(0, -1);
        db.set(`users${val.id}`, {
          id: val.id,
          password: val.password,
          email: val.email,
          bio: val.bio,
          link: req.body.submit_text,
          badge: val.badge,
          icon: val.icon,
          intents: val.intents
        }).then(() => {
          res.render("./settings_profile.ejs", {
            status: "",
            account: val,
            serverConfig
          });
        });
      }
    }
  });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

// いらないDEATH
// app.get("/upload/icon", (req, res) => {
//   res.render("upload", { message: `` });
// });

app.post("/upload/icon", upload.single("img_file"), (req, res) => {
  if (req.file) {
    const path = req.file.path.replace(/\\/g, "/");
    if (path) {
      db.get("users" + req.cookies.id).then((user_data) => {
        if (user_data) {
          if (req.cookies.password === user_data.password) {
            check_image_validity(path)
              .then(() => {
                const dest = __dirname + "/views/image/user/" + req.cookies.id + require("path").extname(req.file.originalname);
                fs.renameSync(path, dest); // 長い一時ファイル名を元のファイル名にリネームする。
                user_data.icon = `/image/user/${req.cookies.id + require("path").extname(req.file.originalname)}`;
                db.set("users" + req.cookies.id, user_data).then(() => {
                  res.redirect("/settings/profile");
                });
              })
              .catch((err) => {
                fs.unlinkSync(path);
                res.render("upload", { message: "エラー：アップロードされたファイルを正常保存できませんでした。" + err });
              });
          } else {
            fs.unlinkSync(path);
            res.render("upload", { message: "エラー：パスワードが一致しません。" });
          }
        } else {
          fs.unlinkSync(path);
          res.render("upload", { message: "エラー：ログインしてください。" });
        }
      });
    } else {
      fs.unlinkSync(path);
      res.render("upload", { message: "エラー：アップロードできませんでした。" });
    }
  } else {
    res.render("upload", { message: "エラー：アップロードできませんでした。" });
  }
});

app.use((req, res) => {
  res.status(404);
  res.render("./404.ejs", {
    status: req.path + "は存在しません。",
    serverConfig
  });
});

app.use((err, req, res) => {
  res.status(500);
  res.end("500 error! : " + err);
});

let online_device = 0;

io.on("connection", (socket) => {
  online_device += 1;
  console.log("現在観覧中のデバイス数:", online_device);

  socket.on("disconnect", () => {
    online_device -= 1;
    console.log("現在観覧中のデバイス数:", online_device);
  });

  socket.on('getServerConfig', () => {
    socket.emit('serverConfig', serverConfig);
  });

  socket.on("init", async (datas) => {
    const db_datas = await db.get("messages" + datas.thread.id);
    for (let index = 0; index < db_datas.message.length; index++) {
      if (typeof db_datas.message[index].text === 'string') {
        // db_datas.message[index].text = escape_html(db_datas.message[index].text);
        db_datas.message[index].text = md.render(db_datas.message[index].text);
      }
    }
    socket.emit("update_all_messages", {
      message: db_datas.message,
      thread: {
        id: datas.thread.id
      }
    });

    rssParser.parseURL('https://forest.watch.impress.co.jp/data/rss/1.0/wf/feed.rdf')
      .then((feed) => {
        socket.emit("update-rss", feed.items.splice(0, 10));
      })
      .catch((error) => {
        console.error('RSS 取得失敗', error);
      });
  });

  socket.on("woke-up", async (datas) => {
    const db_datas = await db.get("messages" + datas.thread.id);
    if (db_datas === undefined || db_datas === null) {
      socket.emit("update_status", { text: "原因不明のエラーが発生しました。再読み込みしてみてください。" });
      return;
    }
    for (let i = 0; i < db_datas.message.length - 1; i++) {
      if (i >= db_datas.message.length - 1) {
        socket.emit("update_all_messages", {
          message: db_datas.message,
          thread: {
            id: datas.thread.id
          }
        });
      } else if (typeof db_datas.message[i].text === "string") {
        db_datas.message[i].text = md.render(db_datas.message[i].text);
      }
    }
  });


  socket.on("post-msg", async (datas) => {
    const db_datas = await db.get("messages" + datas.thread.id);
    if (typeof datas.msg.text !== "string") {
      socket.emit("update_status", { text: "君、メッセージじゃないものを送ろうとしたよね？許されると思ったかな？😟" });
      return;
    }
    if (100 < datas.msg.text.length) {
      socket.emit("update_status", { text: "メッセージは100文字以内にしてください。" });
      return;
    }
    if (db_datas === undefined || db_datas === null) {
      socket.emit("update_status", { text: "原因不明のエラーが発生しました。もう一度送信してみてください。" });
      return;
    }
    socket.emit("update_status", { text: "DBとの接続に成功しました。" });
    if (!datas.user.id) {
      socket.emit("update_status", { text: "ログインしてください。" });
      return;
    }
    console.log(db_datas.message);
    const user_datas = await db.get("users" + datas.user.id);
    if (!user_datas) {
      socket.emit("update_status", { text: "ユーザーが見つかりません。もう一度ログインしてみてください。" });
      return;
    }
    socket.emit("update_status", { text: "DBからユーザーデータを取得しました。" });
    if (datas.user.password !== user_datas.password) {
      socket.emit("update_status", { text: "入力したパスワードが一致しませんでした。" });
      return;
    }
    socket.emit("update_status", { text: "入力したパスワードが一致しました。" });
    if (/^[\s\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$/.test(datas.msg.text) || !datas.msg.text || datas.msg.text === "") {
      socket.emit("update_status", { text: "メッセージが入力されていません。" });
      return;
    }
    socket.emit("update_status", { text: "メッセージが入力されていることを確認しました。" });
    if (db_datas.message.length < max_msg) {
      socket.emit("update_status", { text: "メッセージの上限に達していません。" });

      db_datas.message[db_datas.message.length] = {
        id: datas.user.id,
        text: escape_html(datas.msg.text),
        pinned: false,
        date: new Date()
      };

      if (user_datas.icon === undefined) {
        user_datas.icon = "/image/default_icon";
      }

      await db.set("messages" + datas.thread.id, db_datas);
      // db_datas.message[db_datas.message.length - 1].text = md.render(db_datas.message[db_datas.message.length - 1].text);
      socket.emit("update_status", { text: "メッセージを送信しました。" });
    } else {
      socket.emit("update_status", { text: "メッセージの上限に達しています。" });
      let i = 0;
      const autoDeleteMessage = function autoDeleteMessage() {
        if (!db_datas.message[i].pinned) {
          db_datas.message.splice(i, 1);
        } else if (messages[datas.thread.id][i].pinned) {
          i += 1;
          autoDeleteMessage();
        }
      };
      autoDeleteMessage();

      db_datas.message[db_datas.message.length] = {
        id: datas.user.id,
        text: escape_html(datas.msg.text),
        pinned: false,
        date: new Date()
      };

      if (user_datas.icon === undefined) {
        user_datas.icon = "/image/default_icon";
      }

      await db.set("messages" + datas.thread.id, db_datas);
      // db_datas.message[db_datas.message.length - 1].text = md.render(db_datas.message[db_datas.message.length - 1].text);
      socket.emit("update_status", { text: "メッセージの上限に達していたため古いメッセージを削除しました。" });
    }

    for (let index = 0; index < db_datas.message.length; index++) {
      if (typeof db_datas.message[index].text === 'string') {
        // db_datas.message[index].text = escape_html(db_datas.message[index].text);
        db_datas.message[index].text = md.render(db_datas.message[index].text);
      }
    }

    io.emit("update_all_messages", {
      message: db_datas.message,
      thread: {
        id: datas.thread.id
      }
    });
  });

  // val
  // これ追加しないとバグる
  socket.on("delete-msg", async (datas) => {
    const db_id = `messages${datas.thread.id}`;
    db.get(db_id).then((keys) => {
      if (keys === null) {
        socket.emit("update_status", { text: "スレッドが存在しません。再読み込みをしてみてください。" });
      } else {
        messages[datas.thread.id] = keys;
        db.set(db_id, messages[datas.thread.id]);
      }
    });

    let user_id;
    if (datas.user.id) {
      user_id = `users${datas.user.id.toLowerCase()}`;
    } else {
      user_id = `users${datas.user.id}`;
    }

    const account = await db.get(user_id);

    if (account !== null) {
      if (datas.thread.delete_msg_id !== undefined) {
        // 0 - (逆にしたい数 - 全体の数)
        const msg_data = messages[datas.thread.id].message[0 - (datas.thread.delete_msg_id - (messages[datas.thread.id].message.length - 1))];

        if (msg_data !== null) {
          if (msg_data.id === datas.user.id.toLowerCase()) {
            if (datas.user.password !== account.password) return;
            console.log(msg_data.id, "が", msg_data.text, "を削除しようとしています。");
            messages[datas.thread.id].message.splice(0 - (datas.thread.delete_msg_id - (messages[datas.thread.id].message.length - 1)), 1);

            db.set(db_id, messages[datas.thread.id]).then(() => {
              for (let i = 0; i < messages[datas.thread.id].message.length - 1; i++) {
                if (i >= messages[datas.thread.id].message.length - 2) {
                  socket.emit("update_status", { text: "メッセージを削除しました。" });
                  io.emit("update_all_messages", {
                    message: messages[datas.thread.id].message,
                    thread: {
                      id: datas.thread.id
                    }
                  });
                } else if (typeof messages[datas.thread.id].message[i].text === "string") {
                  messages[datas.thread.id].message[i].text = md.render(messages[datas.thread.id].message[i].text);
                }
              }
            });
          } else {
            console.log(msg_data.id, datas.user.id.toLowerCase());
            const users_id = [];
            const user_icons = [];
            for (let i = 0; i < messages[datas.thread.id].message.length; i++) {
              const user_id = messages[datas.thread.id].message[i].id;

              if (users_id.indexOf(user_id) === -1) {
                users_id[users_id.length] = user_id;
                const user = await db.get("users" + user_id);
                if (user.icon === undefined) user.icon = "/image/default_icon";
                user_icons[user_icons.length] = user.icon;
              } else {
                users_id[users_id.length] = user_id;
                let icon = user_icons[users_id.indexOf(user_id)];
                if (icon === undefined) icon = "/image/default_icon";
                user_icons[user_icons.length] = icon;
              }
            }

            socket.emit("update_status", { text: "メッセージの削除は送信者と同じである必要があります。" });
          }
        } else {
          const users_id = [];
          const user_icons = [];
          for (let i = 0; i < messages[datas.thread.id].message.length; i++) {
            const user_id = messages[datas.thread.id].message[i].id;

            if (users_id.indexOf(user_id) === -1) {
              users_id[users_id.length] = user_id;
              const user = await db.get("users" + user_id);
              if (user.icon === undefined) user.icon = "/image/default_icon";
              user_icons[user_icons.length] = user.icon;
            } else {
              users_id[users_id.length] = user_id;
              let icon = user_icons[users_id.indexOf(user_id)];
              if (icon === undefined) icon = "/image/default_icon";
              user_icons[user_icons.length] = icon;
            }
          }

          socket.emit("update_status", { text: "メッセージが存在しません。" });
        }
      } else {
        const users_id = [];
        const user_icons = [];
        for (let i = 0; i < messages[val].message.length; i++) {
          const user_id = messages[val].message[i].id;

          if (users_id.indexOf(user_id) === -1) {
            users_id[users_id.length] = user_id;
            const user = await db.get("users" + user_id);
            if (user.icon === undefined) user.icon = "/image/default_icon";
            user_icons[user_icons.length] = user.icon;
          } else {
            users_id[users_id.length] = user_id;
            let icon = user_icons[users_id.indexOf(user_id)];
            if (icon === undefined) icon = "/image/default_icon";
            user_icons[user_icons.length] = icon;
          }
        }

        socket.emit("update_status", { text: "削除に必要なデータが存在しません。もう一度リクエストしてください。" });
      }
    } else {
      const users_id = [];
      const user_icons = [];
      for (let i = 0; i < messages[datas.thread.id].message.length; i++) {
        const user_id = messages[datas.thread.id].message[i].id;

        if (users_id.indexOf(user_id) === -1) {
          users_id[users_id.length] = user_id;
          const user = await db.get("users" + user_id);
          if (user.icon === undefined) user.icon = "/image/default_icon";
          user_icons[user_icons.length] = user.icon;
        } else {
          users_id[users_id.length] = user_id;
          let icon = user_icons[users_id.indexOf(user_id)];
          if (icon === undefined) icon = "/image/default_icon";
          user_icons[user_icons.length] = icon;
        }
      }

      socket.emit("update_status", { text: "ログインしてください。" });
    }
  });
});

function escape_html(string) {
  if (typeof string !== "string") return string;
  return string.replace(/[&'`"<>]/g, (match) => {
    return {
      "&": "&amp;",
      "'": "&#x27;",
      "`": "&#x60;",
      '"': "&quot;",
      "<": "&lt;",
      ">": "&gt;"
    }[match];
  });
}

server.listen(serverConfig.server_port, () => {
  console.log("サーバーを起動しました");
});
