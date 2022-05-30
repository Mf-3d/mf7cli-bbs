"use strict";

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
const http = require("http");
const server = http.Server(app);
const fs = require("fs");
const bodyParser = require("body-parser");
const db_client = require("@replit/database");
const cookieparser = require("cookie-parser");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

// トークン用
const uuidjs = require("uuidjs");
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
});

// 画像のあれ
const check_image_validity = (file_path) => sharp(file_path).toBuffer();

// メール送信のあれ
const auth = {
  type: "OAuth2",
  user: process.env.mail_address, // エイリアスのアドレス
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
const db = new db_client();

// なにこれ
// 使われてる
let userlist;

// let special_token = {
//   max_use: 1,
//   use: 0,
//   token: uuidjs.generate()
// }

// db.set("emailauthque", []);

// キューを削除するあれ
setInterval(async () => {
  const val = await db.get("emailauthque")
  if (val === null) {
    db.set("emailauthque", []);
    return;
  }
  val.forEach((value, index) => {
    const limit_date = new Date(val[index]["date"]);
    if (limit_date <= new Date()) {
      val.splice(index, 1);
      db.set("emailauthque", val);
      console.log(val);
      console.log(`キュー${index}の保存期間が切れたため削除しました。`);
    }
  });
}, 30000);

// ユーザーリストを表示
async function get_userlist() {
  return await db.list("users");
}

// 起動時に欲しい(?)
(async () => {
  console.log(await get_userlist());
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
            result[result.length] = val["id"];
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
            result[result.length] = val["id"];
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

// (async () => {
//   console.log("🤔")
//   userlist_match(await get_userlist(), "email").then((val) => {
//     console.log("🤔: ", val);
//     val.forEach((value) => {
//       db.get(`users${value}`).then((val) => {
//         if(val !== null){
//           if(!val.badge) val.badge = [];
//           // val.badge[val.badge.length] = "メールアドレス登録者";
//           // val.badge.splice(val.badge.length, 1);
//           db.set(`users${value}`, val);
//         }
//       });
//     });
//   });
// })();

// db.get("userswaryu_YND").then((val) => {
//   val.id = 'waryu_ynd';
//   db.set("userswaryu_ynd", val);
//   db.delete("userswaryu_YND");
//   console.log(val);
// });

// db.get("usersSorakime").then((val) => {
//   val.id = 'sorakime';
//   db.set("userssorakime", val);
//   db.delete("usersSorakime");
//   console.log(val);
// });

// スリープはいずれ使う😟/ 処理がすべて止まるから使わないことをオススメする by 領域違反
// horn
function sleep(waitMsec) {
  const startMsec = new Date();

  // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
  while (new Date() - startMsec < waitMsec);
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

// db.get("message/chat1").then(keys => {
//   messages = keys;
//   console.log(messages);
//   messages.message[0] = {
//     id: 'system', text: 'コードを結構書き換えました。', pinned: true
//   }

//   db.set("message/chat1", messages).then(() => {});
// });

// EJSを使用😟
app.set("view engine", "ejs");
// これはreq.bodyのやつ
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// 絶対使う
app.use(cookieparser());
// あれだよ
app.use("/image", express.static(__dirname + "/views/image"));
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
  if (hostname.match("mf7cli.tk") !== null || hostname.match("mf7cli.tk") !== undefined) {
    next();
  } else {
    console.log(hostname);
    res.send(`
        <script>
          location.href = "https://bbs.mf7cli.tk"
        </script>
      `);
  }
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
  });
});

// Socket.IOにしない(多分)
app.get("/login", (req, res) => {
  res.render("./login.ejs", {
    status: "",
    redirect_uri: null
  });
});

// スレッドにもこれがあったほうがいい
app.get("/users/", (req, res) => {
  res.render("./users_page_home.ejs", {});
});

// ユーザーページ
app.get("/users/:user_id", (req, res) => {
  db.get("users" + req.params.user_id.toLowerCase()).then((val) => {
    if (val !== null) {
      // res.send(val.id + 'さんのページです。');
      res.render("./users_page.ejs", {
        account: val
      });
    } else {
      res.send(req.params.user_id + "さんは存在しません。");
    }
  });
});

// アイコン😟
// imgでリダイレクト😟
app.get("/users/:user_id/icon", async (req, res) => {
  const val = await db.get("users" + req.params.user_id.toLowerCase());
  if (val === null) {
    res.send(req.params.user_id + "さんは存在しません。");
    return;
  }
  if (!val.icon) {
    res.redirect("/image/default_icon");
    return;
  }
  if (val.icon.indexOf("http") !== -1) {
    res.redirect(val.icon);
  } else {
    res.sendFile(__dirname + "/views" + val.icon);
  }
});


// あとでパスワードが一致がなんとかかんとか😟
// app.post("/api/users/get_user/:user_id", async (req, res) => {
//   if (!req.body.keys) {
//     res.status(400);
//     res.json({
//       message: "必要なデータがありません。",
//       req_data: req.body
//     });
//     return;
//   }
//   if (typeof req.body.keys !== "object") {
//     res.status(400);
//     res.json({
//       message: "キーの形がObjectではありません。",
//       req_data: req.body
//     });
//     return;
//   }
//   if (!req.body.keys[1]) {
//     res.status(400);
//     res.json({
//       message: "パスワードがありません。",
//       req_data: req.body
//     });
//     return;
//   }
//   const client_val = await db.get("users" + req.body.keys[0].toLowerCase());
//   if (client_val === null) {
//     res.status(400);
//     res.json({
//       message: "クライアントユーザーが存在しません。",
//       req_data: req.body
//     });
//     return;
//   }
//   if (!bcrypt.compareSync(req.body.keys[1], client_val.password)) {
//     res.status(400);
//     res.send("クライアントユーザーのパスワードが存在しません。");
//     return;
//   }
//   const val = await db.get("users" + req.params.user_id.toLowerCase());
//   if (val === null) {
//     res.status(404);
//     res.send(req.params.user_id + "さんは存在しません。");
//     return;
//   }
//   res.json({
//     user_id: val.id,
//     bio: val.bio,
//     link: val.link,
//     icon: val.icon,
//   });
// });
// 😟

app.get("/logout", (req, res) => {
  if (req.cookies.id !== null && req.cookies.password !== null) {
    res.clearCookie("id");
    res.clearCookie("password");
    res.render("./logout.ejs", {
      status: "ログアウトに成功しました"
    });
  } else {
    res.render("./logout.ejs", {
      status: "ログインしてください"
    });
  }
});

app.get("/register", (req, res) => {
  res.render("./register.ejs", {
    status: ""
  });
});

app.get("/settings", async (req, res) => {
  const user_id = `users${req.cookies.id}`;

  const val = await db.get(user_id);
  if (val === null) {
    res.render("./login.ejs", {
      status: "設定を見るにはログインをしてください",
      redirect_uri: null
    });
    return;
  }
  if (req.cookies.password !== val.password) {
    res.render("./login.ejs", {
      status: "設定を見るにはログインをしてください",
      redirect_uri: null
    });
    return;
  }
  res.render("./settings.ejs", {
    status: "",
    account: val,
    api_key: val.api ? val.api.mf7cli.api_key : ""
  });
});

app.get("/settings/get_api_key", (req, res) => {
  const user_id = `users${req.cookies.id}`;
  db.get(user_id).then((val) => {
    if (val !== null) {
      if (req.cookies.password === val.password) {
        let api_key = Math.floor(Math.random() * (999 - 100) + 100);
        const user = {
          id: val["id"],
          password: val["password"],
          api: val["api"],
          email: val["email"],
          bio: val["bio"],
          link: val["link"],
          badge: val["badge"],
          icon: val["icon"]
        };
        if (user.api === null || user.api === undefined) user.api = { mf7cli: { api_key: "" } };
        user.api.mf7cli.api_key = api_key;

        db.set(user_id, user).then(() => {
          console.log(val["id"] + "さんがAPIキーを生成しました。");
        });

        res.render("./settings.ejs", {
          status: "APIキーを生成しました",
          account: val,
          api_key
        });
      } else {
        if (val.api) {
          res.render("./login.ejs", {
            status: "ログインしてください",
            redirect_uri: null
          });
        } else {
          res.render("./login.ejs", {
            status: "ログインしてください",
            redirect_uri: null
          });
        }
      }
    } else {
      res.render("./login.ejs", {
        status: "ログインしてください",
        redirect_uri: null
      });
    }
  });
});

app.post("/settings/change_password", (req, res) => {
  const user_id = `users${req.cookies.id}`;
  db.get(user_id).then((val) => {
    if (val !== null) {
      if (
        req.body["submit_password"] === val.password &&
        req.body["submit_new_password"].length >= 5 &&
        req.body["submit_new_password"] !== val.password
      ) {
        db.set(user_id, {
          id: req.cookies.id,
          password: bcrypt.hashSync(req.body["submit_new_password"], 10),
          // あとで直す
          api: val["api"],
          email: val["email"],
          bio: val["bio"],
          link: val["link"],
          badge: val["badge"],
          icon: val["icon"]
        }).then(() => {});

        console.log(val["id"] + "がパスワードを変更しました。");
        if (val.api) {
          res.cookie("id", val["id"], { httpOnly: false });
          res.cookie("password", req.body["submit_new_password"], { httpOnly: false });

          res.render("./settings.ejs", {
            status: "パスワードの変更に成功しました",
            account: val,
            api_key: val.api.mf7cli.api_key
          });
        } else {
          res.cookie("id", val["id"], { httpOnly: false });
          res.cookie("password", req.body["submit_new_password"], { httpOnly: false });

          res.render("./settings.ejs", {
            status: "パスワードの変更に成功しました",
            account: val,
            api_key: ""
          });
        }
      } else if (req.cookies.password !== val.password && req.body["submit_password"] === val.password) {
        if (val.api) {
          res.render("./settings.ejs", {
            status: "パスワードが一致しません",
            account: val,
            api_key: val.api.mf7cli.api_key
          });
        } else {
          res.render("./settings.ejs", {
            status: "パスワードが一致しません",
            account: val,
            api_key: ""
          });
        }
      } else if (req.body["submit_new_password"] === val.password) {
        if (val.api) {
          res.render("./settings.ejs", {
            status: "新しいパスワードは現在のパスワードではないものを指定してください",
            account: val,
            api_key: val.api.mf7cli.api_key
          });
        } else {
          res.render("./settings.ejs", {
            status: "新しいパスワードは現在のパスワードではないものを指定してください",
            account: val,
            api_key: ""
          });
        }
      }
    } else if (val === null) {
      if (val.api) {
        res.render("./login.ejs", {
          status: "ログインしてください",
          redirect_uri: null
        });
      } else {
        res.render("./login.ejs", {
          status: "ログインしてください",
          redirect_uri: null
        });
      }
    }
  });
});

app.post("/settings/change_email", async (req, res) => {
  if (email_pattern.test(req.body["submit_text"])) {
    const user_id = `users${req.cookies.id}`;
    const emailAuthQue = await db.get("emailauthque");
    const val = await db.get(user_id);
    if (emailAuthQue !== null && val !== null) {
      if (emailAuthQue.length <= 5 && userlist_match(await get_userlist(), "email", req.body["submit_text"]) === 0) {
        const date = new Date();

        emailAuthQue[emailAuthQue.length] = {
          email: req.body["submit_text"],
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
          mailOptions.to = req.body["submit_text"];
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
              <a href="https://bbs.mf7cli.tk/auth/exist/${emailAuthQue[emailAuthQue.length - 1].token}">認証する</a>
            </body>
          </html>`;

          transporter.sendMail(mailOptions);
          res.render("./login.ejs", {
            status: "確認用メールを送信しました。",
            account: val,
            api_key: "",
            redirect_uri: "/"
          });
        });
      } else if (userlist_match(await get_userlist(), "email", req.body["submit_text"]) >= 1) {
        console.log(req.cookies.id + "さんの入力したメールアドレスは既に使用されています。");
        if (val.api) {
          res.render("./register.ejs", {
            status: "入力したメールアドレスは既に使用されています。"
          });
        } else {
          res.render("./register.ejs", {
            status: "入力したメールアドレスは既に使用されています。"
          });
        }
      } else if (emailAuthQue.length > 5) {
        console.log(req.cookies.id + "が登録しようとしています。メール認証の最大件数を超えています。");
        if (val.api) {
          res.render("./login.ejs", {
            // status: "登録に成功しました。\nログインしてください。"
            status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
            redirect_uri: "/settings"
          });
        } else {
          res.render("./login.ejs", {
            // status: "登録に成功しました。\nログインしてください。"
            status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
            redirect_uri: "/settings"
          });
        }
      } else if (val === null) {
        console.log(req.cookies.id + "さん、予期しないエラーが発生しました。");
        res.render("./login.ejs", {
          status: "予期しないエラーが発生しました。もう一度ログインしてください。",
          redirect_uri: "/settings"
        });
      } 
      else {
        res.render("./login.ejs", {
          status: "予期しないエラーが発生しました。",
          account: val,
          api_key: ""
        });
      }
    } else {
      console.log(req.cookies.id + "さん、予期しないエラーが発生しました。");
      res.render("./login.ejs", {
        status: "予期しないエラーが発生しました。もう一度ログインしてください。",
        redirect_uri: ""
      });
    }
  } else {
    console.log(req.cookies.id + "さん、正しいメールアドレスを入力してください。");
    if (val.api) {
      res.render("./settings.ejs", {
        status: "正しいメールアドレスを入力してください。",
        account: val,
        api_key: val.api.mf7cli.api_key
      });
    } else {
      res.render("./settings.ejs", {
        status: "正しいメールアドレスを入力してください。",
        account: val,
        api_key: ""
      });
    }
  }
});

app.get("/auth/:token", (req, res) => {
  db.get("emailauthque").then((val) => {
    if (val !== null) {
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

      console.log(val[checkToken().length - 1]);

      if (checkToken().length >= 1) {
        if (val[checkToken().length - 1].link_exist === false) {
          console.log("誰かがメールアドレス認証の画面にきたよ");
          res.render("./auth.ejs", {
            status: "",
            account: checkToken()[checkToken().length - 1]
          });
        } else {
          console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
          res.render("./register.ejs", {
            status:
              "Tokenが新規登録用の物だったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。"
          });
        }
      } else {
        console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
        res.render("./register.ejs", {
          status: "Tokenが存在しなかったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。"
        });
      }
    } else {
      console.log(
        checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。"
      );
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1]
      });
    }
  });
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
          account: checkToken()[checkToken().length - 1]
        });
      } else {
        console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
        res.render("./register.ejs", {
          status: "Tokenが存在しなかったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。"
        });
      }
    } else {
      console.log(
        checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。"
      );
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1]
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
      if (bcrypt.compareSync(req.body["submit_password"], checkToken()[checkToken().length - 1].password)) {
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
            redirect_uri: "/"
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
            redirect_uri: "/"
          });
        }
      } else {
        console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。パスワードが違うみたいだね。");
        res.render("./auth.ejs", {
          status: "入力したパスワードと仮登録で使用したパスワードが一致しません。",
          account: checkToken()[checkToken().length - 1]
        });
      }
    } else {
      console.log(
        checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。"
      );
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1]
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
      if (bcrypt.compareSync(req.body["submit_password"], checkToken()[checkToken().length - 1].password)) {
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
          redirect_uri: null
        });
      } else {
        console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。パスワードが違うみたいだね。");
        res.render("./auth.ejs", {
          status: "入力したパスワードと仮登録で使用したパスワードが一致しません。",
          account: checkToken()[checkToken().length - 1]
        });
      }
    } else if ((await userlist_match(await get_userlist(), "id", checkToken()[checkToken().length - 1].id)) !== 0) {
      console.log("a: ", checkToken()[checkToken().length - 1].id);

      res.render("./auth.ejs", {
        status: checkToken()[checkToken().length - 1].id + "は存在します。",
        account: checkToken()[checkToken().length - 1]
      });
    } else {
      console.log(
        checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。"
      );
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1]
      });
    }
  });
});

app.post("/login", (req, res) => {
  const user_id = `users${req.body["submit_id"][0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    if (val !== null && req.body["submit_id"][0].length >= 5) {
      if (bcrypt.compareSync(req.body["submit_id"][1], val.password)) {
        console.log(req.body["submit_id"][0] + "がログインしました");
        res.cookie("id", req.body["submit_id"][0].toLowerCase(), {
          maxAge: 3e9,
          httpOnly: false
        });
        res.cookie("password", val.password, {
          maxAge: 3e9,
          httpOnly: false
        });
        res.render("./login.ejs", {
          status: "ログインに成功しました。",
          redirect_uri: "/"
        });
      } else {
        console.log(req.body["submit_id"][0] + 'がログインに失敗しました。パスワードがDBのパスワードと一致しません。"');
        res.render("./login.ejs", {
          status: "ログインに失敗しました。パスワードがDBのパスワードと一致しません。",
          redirect_uri: null
        });
      }
    } else {
      console.log(req.body["submit_id"][0] + "は存在しません");
      res.render("./login.ejs", {
        status: "ユーザーが存在しません。",
        redirect_uri: null
      });
    }
  });
});

app.post("/register", (req, res) => {
  console.log(req.body["submit_id"][0]);
  const user_id = `users${req.body["submit_id"][0].toLowerCase()}`;
  db.get(user_id).then((val) => {
    db.list("users").then(async (matches) => {
      userlist = matches;
      console.log(userlist);

      if (
        val === null &&
        req.body["submit_id"][0].length >= 5 &&
        req.body["submit_id"][1].length >= 8 &&
        isAlphabet(req.body["submit_id"][0]) &&
        req.body["submit_id"][0].length <= 15 &&
        req.body["submit_id"][2] &&
        email_pattern.test(req.body["submit_id"][2]) &&
        (await userlist_match(userlist, "email", req.body["submit_id"][2])) === 0 &&
        (await userlist_match(userlist, "id", req.body["submit_id"][0])) === 0
      ) {
        console.log("一致したメールアドレス: ", await userlist_match(await get_userlist(), "email", req.body["submit_id"][2]));
        let emailAuthQue = await db.get("emailauthque");
        if (emailAuthQue !== null) {
          console.log(emailAuthQue);
          if (emailAuthQue.length <= 5) {
            const date = new Date();
            emailAuthQue[emailAuthQue.length] = {
              email: req.body["submit_id"][2],
              token: uuidjs.generate(),
              date: date.setMinutes(date.getMinutes() + 10),
              id: req.body["submit_id"][0],
              password: bcrypt.hashSync(req.body["submit_id"][1], 10),
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
              console.log(req.body["submit_id"][0] + "が登録しようとしています");
            });
            mailOptions.subject = "【重要】アカウント登録の確認";
            mailOptions.to = req.body["submit_id"][2];
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
                <a href="https://bbs.mf7cli.tk/auth/${emailAuthQue[emailAuthQue.length - 1].token}">認証する</a>
              </body>
            </html>`;
            transporter.sendMail(mailOptions);
            console.log(req.body["submit_id"][0] + "が登録しようとしています");
            res.render("./login.ejs", {
              status: "確認用メールを送信しました。",
              redirect_uri: "/"
            });
          } else {
            console.log(
              req.body["submit_id"][0] +
                "が登録しようとしています。現在メール認証の最大件数を超えているためメールを送信できませんでした。"
            );
            res.render("./login.ejs", {
              // status: "登録に成功しました。\nログインしてください。"
              status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
              redirect_uri: "/"
            });
          }
        } else {
          emailAuthQue = [];
          emailAuthQue[emailAuthQue.length] = {
            email: req.body["submit_id"][2],
            token: uuidjs.generate(),
            date: new Date(),
            id: req.body["submit_id"][0],
            password: bcrypt.hashSync(req.body["submit_id"][1], 10),
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
            console.log(req.body["submit_id"][0] + "が登録しようとしています");
            res.render("./login.ejs", {
              // status: "登録に成功しました。\nログインしてください。"
              status: "確認用メールを送信しました。",
              redirect_uri: "/"
            });
          });

          mailOptions.to = req.body["submit_id"][2];
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
              <a href="https://bbs.mf7cli.tk/auth/${emailAuthQue[emailAuthQue.length - 1].token}">認証する</a>
            </body>
          </html>`;
          transporter.sendMail(mailOptions);
          console.log(req.body["submit_id"][0] + "が登録しようとしています");
          res.render("./login.ejs", {
            status: "確認用メールを送信しました。",
            redirect_uri: "/"
          });
          // db.set(user_id, {
          //   id: req.body["submit_id"][0],
          //   password: bcrypt.hashSync(req.body["submit_id"][1], 10)
          // }).then(() => { });

          // console.log(req.body["submit_id"][0] + 'が登録しました');
        }
      } else if (val !== null) {
        console.log(req.body["submit_id"][0] + "は存在します");
        res.render("./register.ejs", {
          status: req.body["submit_id"][0] + "は存在します。別の名前を指定してください。"
        });
      } else if (req.body["submit_id"][0].length < 5 || req.body["submit_id"][1].length < 8 || req.body["submit_id"][0].length > 15) {
        console.log(req.body["submit_id"][0] + "さん、要件を満たしていません。");
        res.render("./register.ejs", {
          status: "パスワードかIDが要件を満たしていません。"
        });
      } else if (!req.body["submit_id"][2] || !email_pattern.test(req.body["submit_id"][2])) {
        console.log(req.body["submit_id"][0] + "さん、要件を満たしていません。");
        res.render("./register.ejs", {
          status: "正しいメールアドレスを入力してください。"
        });
      } else if ((await userlist_match(userlist, "email", req.body["submit_id"][2])) !== 0) {
        console.log(req.body["submit_id"][0] + "さんの入力したメールアドレスは既に使用されています。");
        console.log("リスト: ", userlist, "\n結果: ", await userlist_match(userlist, "email", req.body["submit_id"][2]));
        res.render("./register.ejs", {
          status: "入力したメールアドレスは既に使用されています。"
        });
      } else if ((await userlist_match(userlist, "id", req.body["submit_id"][0])) !== 0) {
        console.log(req.body["submit_id"][0] + "さんの入力したIDは既に使用されています。");
        res.render("./register.ejs", {
          status: "入力したIDは既に使用されています。"
        });
      }
    });
  });
});

// スレッド一覧を取得
threads.threads.forEach((val) => {
  const db_id = `messages${val}`;
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

  app.get(`/api/thread/${val}`, async (req, res) => {
    const db_id = `messages${val}`;
    let messages_db = await db.get(db_id);
    if (messages_db === null || messages_db === undefined) {
      messages_db = { message: [] };
      messages_db["message"][0] = { id: "system", text: `ここは${val}です。`, pinned: true };
    }
    messages[val] = messages_db;

    db.set(db_id, messages[val]);

    res.json(messages[val]);
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
      messages[val] = await db.get(db_id);
      messages[val]["message"][0] = { id: "system", text: `ここは${val}です。`, pinned: true };
      db.set(db_id, messages_db);
      const users_id = [];
      const user_icons = [];
      for (let i = 0; i < messages[val]["message"].length; i++) {
        messages[val]["message"][i].text = md.render(String(messages[val]["message"][i].text));
        const user_id = messages[val]["message"][i]["id"];

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

      res.render("./thread.ejs", {
        thread: { name: val, id: val },
        message: messages[val]["message"],
        status: "",
        md,
        db,
        account,
        cookies: req.cookies,
        users_data: {
          icon: user_icons
        }
      });
    } else {
      messages[val] = { message: [] };
      messages[val]["message"][0] = { id: "system", text: `ここは${val}です。`, pinned: true };

      console.log(messages);

      // let users_id = [];
      const user_icons = [];

      res.render("./thread.ejs", {
        thread: { name: val, id: val },
        message: messages[val]["message"],
        status: "",
        md,
        db,
        account,
        cookies: req.cookies,
        users_data: {
          icon: user_icons
        }
      });
    }
  });

  // app.post(`/thread/${val}/delete`, async (req, res) => {
  //   db.get(db_id).then((keys) => {
  //     if (keys === null) {
  //       keys = { message: [] };
  //       keys["message"][0] = { id: "system", text: `ここは${val}です。`, pinned: true };
  //     }

  //     messages[val] = keys;
  //     console.log(messages);

  //     db.set(db_id, messages[val]).then(() => {});
  //   });

  //   let user_id;
  //   if (req.cookies.id) {
  //     user_id = `users${req.cookies.id.toLowerCase()}`;
  //   } else {
  //     user_id = `users${req.cookies.id}`;
  //   }

  //   const account = await db.get(user_id);
  //   if (account !== null) {
  //     if (req.body["message_num"] !== undefined) {
  //       // 0 - (逆にしたい数 - 全体の数)
  //       const msg_data = messages[val].message[0 - (req.body["message_num"] - (messages[val].message.length - 1))];

  //       if (msg_data !== null) {
  //         if (msg_data.id === req.cookies.id.toLowerCase()) {
  //           console.log(msg_data.id, "が", msg_data.text, "を削除しようとしています。");
  //           messages[val].message.splice(0 - (req.body["message_num"] - (messages[val].message.length - 1)), 1);
  //           db.set(db_id, messages[val]).then(() => {
  //             res.redirect("/thread/" + val);
  //           });
  //         } else {
  //           console.log(msg_data.id, req.cookies.id.toLowerCase());
  //           const users_id = [];
  //           const user_icons = [];
  //           for (let i = 0; i < messages[val]["message"].length; i++) {
  //             const user_id = messages[val]["message"][i]["id"];

  //             if (users_id.indexOf(user_id) === -1) {
  //               users_id[users_id.length] = user_id;
  //               const user = await db.get("users" + user_id);
  //               if (user.icon === undefined) user.icon = "/image/default_icon";
  //               user_icons[user_icons.length] = user.icon;
  //             } else {
  //               users_id[users_id.length] = user_id;
  //               let icon = user_icons[users_id.indexOf(user_id)];
  //               if (icon === undefined) icon = "/image/default_icon";
  //               user_icons[user_icons.length] = icon;
  //             }
  //           }

  //           res.render("./thread.ejs", {
  //             thread: { name: val, id: val },
  //             message: messages[val]["message"],
  //             status: "メッセージの削除は送信者と同じである必要があります。",
  //             md,
  //             db,
  //             account,
  //             cookies: req.cookies,
  //             users_data: {
  //               icon: user_icons
  //             }
  //           });
  //         }
  //       } else {
  //         const users_id = [];
  //         const user_icons = [];
  //         for (let i = 0; i < messages[val]["message"].length; i++) {
  //           const user_id = messages[val]["message"][i]["id"];

  //           if (users_id.indexOf(user_id) === -1) {
  //             users_id[users_id.length] = user_id;
  //             const user = await db.get("users" + user_id);
  //             if (user.icon === undefined) user.icon = "/image/default_icon";
  //             user_icons[user_icons.length] = user.icon;
  //           } else {
  //             users_id[users_id.length] = user_id;
  //             let icon = user_icons[users_id.indexOf(user_id)];
  //             if (icon === undefined) icon = "/image/default_icon";
  //             user_icons[user_icons.length] = icon;
  //           }
  //         }

  //         res.render("./thread.ejs", {
  //           thread: { name: val, id: val },
  //           message: messages[val]["message"],
  //           status: "メッセージが存在しません。",
  //           md,
  //           db,
  //           account,
  //           cookies: req.cookies,
  //           users_data: {
  //             icon: user_icons
  //           }
  //         });
  //       }
  //     } else {
  //       const users_id = [];
  //       const user_icons = [];
  //       for (let i = 0; i < messages[val]["message"].length; i++) {
  //         const user_id = messages[val]["message"][i]["id"];

  //         if (users_id.indexOf(user_id) === -1) {
  //           users_id[users_id.length] = user_id;
  //           const user = await db.get("users" + user_id);
  //           if (user.icon === undefined) user.icon = "/image/default_icon";
  //           user_icons[user_icons.length] = user.icon;
  //         } else {
  //           users_id[users_id.length] = user_id;
  //           let icon = user_icons[users_id.indexOf(user_id)];
  //           if (icon === undefined) icon = "/image/default_icon";
  //           user_icons[user_icons.length] = icon;
  //         }
  //       }

  //       res.render("./thread.ejs", {
  //         thread: { name: val, id: val },
  //         message: messages[val]["message"],
  //         status: "削除に必要なデータが存在しません。もう一度リクエストしてください。",
  //         md,
  //         db,
  //         account,
  //         cookies: req.cookies,
  //         users_data: {
  //           icon: user_icons
  //         }
  //       });
  //     }
  //   } else {
  //     const users_id = [];
  //     const user_icons = [];
  //     for (let i = 0; i < messages[val]["message"].length; i++) {
  //       const user_id = messages[val]["message"][i]["id"];

  //       if (users_id.indexOf(user_id) === -1) {
  //         users_id[users_id.length] = user_id;
  //         const user = await db.get("users" + user_id);
  //         if (user.icon === undefined) user.icon = "/image/default_icon";
  //         user_icons[user_icons.length] = user.icon;
  //       } else {
  //         users_id[users_id.length] = user_id;
  //         let icon = user_icons[users_id.indexOf(user_id)];
  //         if (icon === undefined) icon = "/image/default_icon";
  //         user_icons[user_icons.length] = icon;
  //       }
  //     }

  //     res.render("./thread.ejs", {
  //       thread: { name: val, id: val },
  //       message: messages[val]["message"],
  //       status: "ログインしてください。",
  //       md,
  //       db,
  //       account,
  //       cookies: req.cookies,
  //       users_data: {
  //         icon: user_icons
  //       }
  //     });
  //   }
  });

// app.post(`/thread/${val}`, async (req, res) => {
//   db.get(db_id).then(keys => {
//     if (keys === null) {
//       keys = {message:[]};
//       keys["message"][0] = { id: 'system', text: `ここは${val}です。`, pinned: true };
//     }
//     console.log(keys);
//     messages[val] = keys;
//     console.log(messages);

//     db.set(db_id, messages[val]).then(() => {
//     });
//   });

//   let user_id;
//   if(req.cookies.id){
//     user_id = `users${req.cookies.id.toLowerCase()}`;
//   }
//   else{
//     user_id = `users${req.cookies.id}`;
//   }

//   let account = await db.get(user_id);
//   if(account !== null){
//     if (req.body.submit_text !== "" && messages[val].message.length < max_msg && req.cookies.id && req.cookies.password && bcrypt.compareSync(req.cookies.password, account["password"])) {
//       db.get(db_id).then(keys => {
//         if (keys === undefined) {
//           keys["message"][0] = { id: 'system', text: `ここは${val}です。`, pinned: true };
//         }

//         messages[val] = keys;

//         messages[val].message[messages[val].message.length] = {
//           id: req.cookies.id.toLowerCase(),
//           text: req.body.submit_text,
//           pinned: false,
//           date: new Date()
//         }

//         db.set(db_id, messages[val]).then(() => {
//           res.redirect(`/thread/${val}`);
//         });
//       });
//     }
//     else if (req.body.submit_text == "") {
//       db.get(db_id).then(keys => {
//         messages[val] = keys;
//         console.log(messages);
//       });

//       let users_id = [];
//       let user_icons = [];
//       for(let i = 0; i < messages[val]["message"].length; i++){
//         let user_id = messages[val]["message"][i]["id"];

//         if(users_id.indexOf(user_id) === -1){
//           users_id[users_id.length] = user_id;
//           let user = await db.get("users" + user_id);
//           if(user.icon === undefined) user.icon = "/image/default_icon";
//           user_icons[user_icons.length] = user.icon;
//         }
//         else{
//           users_id[users_id.length] = user_id;
//           let icon = user_icons[users_id.indexOf(user_id)];
//           if(icon === undefined) icon = "/image/default_icon";
//           user_icons[user_icons.length] = icon;
//         }
//       }

//       res.render("./thread.ejs", {
//         thread: { name: val, id: val },
//         message: messages[val]["message"],
//         status: "メッセージを入力してください。",
//         md: md,
//         db: db,
//         account: account,
//         cookies: req.cookies,
//         users_data: {
//           icon: user_icons
//         }
//       });
//     }
//     else if (!req.cookies.id || !req.cookies.password) {
//       db.get(db_id).then(keys => {
//         messages[val] = keys;
//         console.log(messages);
//       });

//       let users_id = [];
//       let user_icons = [];
//       for(let i = 0; i < messages[val]["message"].length; i++){
//         let user_id = messages[val]["message"][i]["id"];

//         if(users_id.indexOf(user_id) === -1){
//           users_id[users_id.length] = user_id;
//           let user = await db.get("users" + user_id);
//           if(user.icon === undefined) user.icon = "/image/default_icon";
//           user_icons[user_icons.length] = user.icon;
//         }
//         else{
//           users_id[users_id.length] = user_id;
//           let icon = user_icons[users_id.indexOf(user_id)];
//           if(icon === undefined) icon = "/image/default_icon";
//           user_icons[user_icons.length] = icon;
//         }
//       }

//       res.render("./thread.ejs", {
//         thread: { name: val, id: val },
//         message: messages[val]["message"],
//         status: "ログインしてください。",
//         md: md,
//         db: db,
//         account: account,
//         cookies: req.cookies,
//         users_data: {
//           icon: user_icons
//         }
//       });
//     }
//     else if(!bcrypt.compareSync(req.cookies.password, account["password"])){
//       db.get(db_id).then(keys => {
//         messages[val] = keys;
//         console.log(messages);
//       });

//       let users_id = [];
//       let user_icons = [];
//       for(let i = 0; i < messages[val]["message"].length; i++){
//         let user_id = messages[val]["message"][i]["id"];

//         if(users_id.indexOf(user_id) === -1){
//           users_id[users_id.length] = user_id;
//           let user = await db.get("users" + user_id);
//           if(user.icon === undefined) user.icon = "/image/default_icon";
//           user_icons[user_icons.length] = user.icon;
//         }
//         else{
//           users_id[users_id.length] = user_id;
//           let icon = user_icons[users_id.indexOf(user_id)];
//           if(icon === undefined) icon = "/image/default_icon";
//           user_icons[user_icons.length] = icon;
//         }
//       }

//       res.render("./thread.ejs", {
//         thread: { name: val, id: val },
//         message: messages[val]["message"],
//         status: "CookieのパスワードがDBのパスワードと一致しません。\nもう一度ログインしてください。",
//         md: md,
//         db: db,
//         account: account,
//         cookies: req.cookies,
//         users_data: {
//           icon: user_icons
//         }
//       });
//     }
//     else if (messages[val].message.length >= max_msg) {
//       db.get(db_id).then(keys => {
//         messages[val] = keys;
//       });

//       db.set(db_id, messages[val]).then(() => { });

//       let users_id = [];
//       let user_icons = [];
//       for(let i = 0; i < messages[val]["message"].length; i++){
//         let user_id = messages[val]["message"][i]["id"];

//         if(users_id.indexOf(user_id) === -1){
//           users_id[users_id.length] = user_id;
//           let user = await db.get("users" + user_id);
//           if(user.icon === undefined) user.icon = "/image/default_icon";
//           user_icons[user_icons.length] = user.icon;
//         }
//         else{
//           users_id[users_id.length] = user_id;
//           let icon = user_icons[users_id.indexOf(user_id)];
//           if(icon === undefined) icon = "/image/default_icon";
//           user_icons[user_icons.length] = icon;
//         }
//       }

//       let i = 0;

//       messages[val].message[messages[val].message.length] = {
//         id: req.cookies.id,
//         text: req.body.submit_text,
//         pinned: false,
//         date: new Date()
//       }

//       function autoDeleteMessage() {
//         if (messages[val].message[i].pinned == false) {
//           messages[val].message.splice(i, 1);
//         }
//         else if (messages[val].message[i].pinned) {
//           i += 1;
//           autoDeleteMessage();
//         }
//       };

//       autoDeleteMessage();

//       db.set(db_id, messages[val]).then(() => { });

//       res.render("./thread.ejs", {
//         thread: { name: val, id: val },
//         // message: [
//         //   {
//         //     "id":"system",
//         //     "text": "テスト",
//         //     "pinned": true
//         //   }
//         // ]
//         message: messages[val]["message"],
//         status: "メッセージ数が上限を超えているため古いメッセージを削除しました。",
//         md: md,
//         db: db,
//         account: account,
//         cookies: req.cookies,
//         users_data: {
//           icon: user_icons
//         }
//       });
//     }
//   }
//   else{
//     db.get(db_id).then(keys => {
//       messages[val] = keys;
//       console.log(messages);
//     });

//     let users_id = [];
//     let user_icons = [];
//     for(let i = 0; i < messages[val]["message"].length; i++){
//       let user_id = messages[val]["message"][i]["id"];

//       if(users_id.indexOf(user_id) === -1){
//         users_id[users_id.length] = user_id;
//         let user = await db.get("users" + user_id);
//         if(user.icon === undefined) user.icon = "/image/default_icon";
//         user_icons[user_icons.length] = user.icon;
//       }
//       else{
//         users_id[users_id.length] = user_id;
//         let icon = user_icons[users_id.indexOf(user_id)];
//         if(icon === undefined) icon = "/image/default_icon";
//         user_icons[user_icons.length] = icon;
//       }
//     }

//     res.render("./thread.ejs", {
//       thread: { name: val, id: val },
//       message: messages[val]["message"],
//       status: "ログインしてください。",
//       md: md,
//       db: db,
//       account: account,
//       cookies: req.cookies,
//       users_data: {
//         icon: user_icons
//       }
//     });
//   }
// });

// app.get("/chat1", async (req, res) => {
//   db.set("message/chat1",messages).then(() => {});
//   db.get("message/chat1").then(keys => {
//     messages = keys;
//     console.log(messages);
//   });

//   res.render("./thread.ejs", {
//     thread: {name:'雑談1',id:'chat1'},
//     message: messages["message"],
//     status: ""
//   });
// });

// app.post("/chat1", async (req, res) => {
//   db.get("message/chat1").then(keys => {
//     messages = keys;
//     console.log(messages);
//   });

//   console.log(messages.message[0]);

//   if(req.body.submit_text !== "" && messages.message.length < max_msg && messages.message[messages.message.length - 1].text !== req.body.submit_text && req.body.submit_id !== '' && req.body.submit_id !== 'anonymous' && req.body.submit_id !== undefined && req.body.submit_id !== 'system'){
//     messages.message[messages.message.length] = {
//       id: req.body.submit_id,
//       text: req.body.submit_text,
//       pinned: false
//     }

//     db.set("message/chat1", messages).then(() => {
//       res.redirect("/chat1");
//     });
//   }
//   else if(req.body.submit_text == ""){
//     db.get("message/chat1").then(keys => {
//       messages = keys;
//       console.log(messages);
//     });

//     res.render("./thread.ejs", {
//       thread: {name:'雑談1',id:'chat1'},
//       message: messages["message"],
//       status: "メッセージを入力してください。"
//     });
//   }
//   else if(req.body.submit_id == "" || req.body.submit_id == 'anonymous' || req.body.submit_id == undefined || req.body.submit_id == 'system'){
//     res.render("./thread.ejs", {
//       thread: {name:'雑談1',id:'chat1'},
//       // message: [
//       //   {
//       //     "id":"system",
//       //     "text": "テスト",
//       //     "pinned": true
//       //   }
//       // ]
//       message: messages["message"],
//       status: "IDを入力してください。anonymous、systemは使用できません。"
//     });
//   }
//   else if(messages.message.length >= max_msg){
//     db.get("message/chat1").then(keys => {
//       messages = keys;
//       console.log(messages);
//     });

//     db.set("message/chat1",messages).then(() => {});

//     let i = 0;

//     messages.message[messages.message.length] = {
//       id: req.body.submit_id,
//       text: req.body.submit_text,
//       pinned: false
//     }

//     function autoDeleteMessage () {
//       if(messages.message[i].pinned == false){
//         messages.message.splice(i, 1);
//       }
//       else if(messages.message[i].pinned == true){
//         i += 1;
//         autoDeleteMessage();
//       }
//     };

//     autoDeleteMessage();

//     db.set("message/chat1", messages).then(() => {});

//     res.render("./thread.ejs", {
//       thread: {name:'雑談1',id:'chat1'},
//       // message: [
//       //   {
//       //     "id":"system",
//       //     "text": "テスト",
//       //     "pinned": true
//       //   }
//       // ]
//       message: messages["message"],
//       status: "メッセージ数が上限を超えているため古いメッセージを削除しました。"
//     });
//   }

//   console.log(messages);
// });

app.get("/style/style.css", (req, res) => {
  res.sendFile(__dirname + "/views/style/style.css");
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
          redirect_uri: null
        });
      } else {
        res.render("./settings_profile.ejs", {
          status: "",
          account: val
        });
      }
    } else {
      res.render("./login.ejs", {
        status: "設定を見るにはログインをしてください",
        redirect_uri: null
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
      redirect_uri: null
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
    account: val
  });
});;

// app.post("/settings/profile/set_icon", (req, res) => {
//   let user_id = `users${req.cookies.id}`;

//   db.get(user_id).then((val) => {
//     if(val !== null){
//       console.debug(bcrypt.compareSync(req.cookies.password, val.password));
//       if(!bcrypt.compareSync(req.cookies.password, val.password)){
//         res.render("./login.ejs", {
//           status: "設定を見るにはログインをしてください",
//           redirect_uri: null
//         });
//       }
//       else{
//         const checkIfImageExists = (url) => {
//           return new Promise((resolve, reject) => {
//             const img = new Image();
//             img.src = url;
//             img.onload = () => resolve(url);
//             img.onerror = () => reject(url);
//           });
//         };
//         checkIfImageExists(req.body.submit_text)
//         .then((url) => {
//           console.log(`Image found: ${url}`);
//         })
//         .catch((url) => {
//           console.log(`Image not found: ${url}`);
//           req.body.submit_text = "/image/default_icon";
//         });
//         console.log(req.body.submit_text);
//         if(req.body.submit_text.slice(-1) === /,|\n/) req.body.submit_text.slice(0, -1);
//         db.set(`users${val.id}`,{
//           id: val.id,
//           password: val.password,
//           email: val.email,
//           bio: val.bio,
//           link: val.link,
//           badge: val.badge,
//           icon: req.body.submit_text
//         }).then(() => {
//           res.render("./settings_profile.ejs", {
//             status: "",
//             account: val
//           });
//         });
//       }
//     }
//   });
// });

app.post("/settings/profile/set_link", (req, res) => {
  const user_id = `users${req.cookies.id}`;

  db.get(user_id).then((val) => {
    if (val !== null) {
      if (req.cookies.password !== val.password) {
        res.render("./login.ejs", {
          status: "設定を見るにはログインをしてください",
          redirect_uri: null
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
            account: val
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
    status: req.path + "は存在しません。"
  });
});

app.use((err, req, res, next) => {
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
      } else {
        if (typeof db_datas.message[i].text === "string") {
          db_datas.message[i].text = md.render(db_datas.message[i].text);
        }
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
    if (/^[\s\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$/.test(datas.msg.text) || !datas.msg.text　|| datas.msg.text === "") {
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
      db_datas.message[db_datas.message.length - 1].text = md.render(db_datas.message[db_datas.message.length - 1].text);
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
      db_datas.message[db_datas.message.length - 1].text = md.render(db_datas.message[db_datas.message.length - 1].text);
      socket.emit("update_status", { text: "メッセージの上限に達していたため古いメッセージを削除しました。" });
    }
    io.emit("update_messages", {
      message: db_datas.message[db_datas.message.length - 1],
      user: user_datas,
      thread: {
        id: datas.thread.id
      }
    });
  });

  // val
  // これ追加しないとバグる
  socket.on("delete-msg", async (datas) => {
    let db_id = `messages${datas.thread.id}`;
    db.get(db_id).then((keys) => {
      if (keys === null) {
        socket.emit("update_status", { text: "スレッドが存在しません。再読み込みをしてみてください。" });
      } else {
        messages[datas.thread.id] = keys;
        db.set(db_id, messages[datas.thread.id]).then(() => {});
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
            if(datas.user.password !== account.password) return;
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
                } else {
                  if (typeof messages[datas.thread.id].message[i].text === "string") {
                    messages[datas.thread.id].message[i].text = md.render(messages[datas.thread.id].message[i].text);
                  }
                }
              }
            });
          } else {
            console.log(msg_data.id, datas.user.id.toLowerCase());
            const users_id = [];
            const user_icons = [];
            for (let i = 0; i < messages[datas.thread.id]["message"].length; i++) {
              const user_id = messages[datas.thread.id]["message"][i]["id"];

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
          for (let i = 0; i < messages[datas.thread.id]["message"].length; i++) {
            const user_id = messages[datas.thread.id]["message"][i]["id"];

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
        for (let i = 0; i < messages[val]["message"].length; i++) {
          const user_id = messages[val]["message"][i]["id"];

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
      for (let i = 0; i < messages[datas.thread.id]["message"].length; i++) {
        const user_id = messages[datas.thread.id]["message"][i]["id"];

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

server.listen(3000, () => {
  console.log("サーバーを起動しました");
});
