const express = require("express");
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');
const db_client = require('@replit/database');
const cookieparser = require('cookie-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const uuidjs = require('uuidjs');
const email_pattern = /^[A-Za-z0-9]{1}[A-Za-z0-9\+_.-]*@{1}[A-Za-z0-9\+_.-]+.[A-Za-z0-9]+$/;
var md = require('markdown-it')({
  breaks: true,
  linkify: true
});

// const oauth2Client = new OAuth2(
//  process.env.client_id, // ClientID
//  process.env.client_secret, // Client Secret
//  "https://developers.google.com/oauthplayground" // Redirect URL
// );

const auth = {
  type: 'OAuth2',
  user: process.env.mail_address, // エイリアスのアドレス
  clientId: process.env.client_id, // Client ID
  clientSecret: process.env.client_secret, // Client Secret
  refreshToken: process.env.refresh_token // Reflesh Token
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth
});

let mailOptions = {
  from: 'mf7cli-BBS',
  subject: '【重要】アカウント登録の確認'
};

const threads = JSON.parse(fs.readFileSync(__dirname + '/data/threads/threads.json'));

const db = new db_client();

let userlist;

// let special_token = {
//   max_use: 1,
//   use: 0,
//   token: uuidjs.generate()
// }

// db.set("emailauthque", []);

setInterval(() => {
  db.get("emailauthque").then(val => {
    if(val !== null){
      val.map((value, index) => {
        let limit_date = new Date(val[index]["date"])
        if(limit_date <= new Date){
          val.splice(index, 1);
          db.set("emailauthque", val);
          console.log(val);
          console.log("キュー" + index + "の保存期間が切れたため削除しました。");
        }
      });
    }
    else{
      db.set("emailauthque", []);
    }
  });
},30000);

db.list("users").then(matches => {
  userlist = matches;
  console.log(userlist);
});

async function get_userlist(){
  return await db.list("users");
}
// あとで)をつける

async function userlist_match(list, key, findkey) {
  console.log("探すキー: ",findkey);
  if(findkey){
    let result = [];
    for(let i = 0;i < list.length; i++){
      let val = await db.get(list[i]);
      if(val !== null){
        if(val[key]){
          if(val[key] === findkey){
            result[result.length] = val["id"];
            console.log("一致したキー: ",val[key]);
          }
        }
      }
      
      if(i === list.length - 1){
        console.log(findkey, "の結果: ",result.length);
        return result.length;
      }
    }
  }
  else{
    let result = [];
    for(let i = 0;i < list.length; i++){
      console.log(i);
      let val = await db.get(list[i])
      if(val !== null){
        if(val[key]){
          if(val[key] !== undefined && val[key] !== null){
            result[result.length] = val["id"];
            console.log("一致したキー: ",val[key]);
          }
        }
      }
      
      if(i === list.length - 1){
        console.log("結果: ",result);
        return result;
      }
    }
  }
}

// db.delete("usersmf7cli").then(() => {});
db.delete("users5d8074ccdbb24e").then(() => {});
db.delete("users7cdc2237156ebc").then(() => {});
db.delete("users78557b8a4aa89a").then(() => {});
db.delete("users5a3214994dd71f").then(() => {});
db.delete("usersadmin").then(() => {});
db.delete("userskn4655").then(() => {});
db.delete("users1f163e0ba64e756df4c218b0c83a6372a74ffea36bdc2179356a8a724605039bcdf87f5f29fc55b0ea745d85b8cee4c4d8ab5d73e28d8b80c6efff5e29e82f10").then(() => {});
db.delete("usersundefined").then(() => {});
db.delete("userstest_TEST").then(() => {});
db.delete("userstwinkle ").then(() => {});
db.delete("usersあの画像嵐じゃないよね。").then(() => {});
// db.get("usersmf7cli").then((val) => {
//   val.badge = ["Admin"];
//   db.set("usersmf7cli", val);
// });

(async () => {
  console.log("🤔")
  userlist_match(await get_userlist(), "email").then((val) => {
    console.log("🤔: ", val);
    val.forEach((value) => {
      db.get(`users${value}`).then((val) => {
        if(val !== null){
          if(!val.badge) val.badge = [];
          // val.badge[val.badge.length] = "メールアドレス登録者";
          // val.badge.splice(val.badge.length, 1);
          db.set(`users${value}`, val);
        }
      });
    });
  });
})();

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

function sleep(waitMsec) {
  var startMsec = new Date();

  // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
  while (new Date() - startMsec < waitMsec);
}

function isAlphabet(str) {
  str = (str == null) ? "" : str;
  if (str.match(/^[A-Za-z0-9_]+$/)) {
    return true;
  } else {
    return false;
  }
}

let messages = {
}

let max_msg = 1000;

// db.get("message/chat1").then(keys => {
//   messages = keys;
//   console.log(messages);
//   messages.message[0] = { 
//     id: 'system', text: 'コードを結構書き換えました。', pinned: true
//   }

//   db.set("message/chat1", messages).then(() => {});
// });

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieparser());
app.use("/image/badges", express.static(__dirname + "/views/image/badges"));

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

app.get("/", function(req, res) {
  let user_id = `users${req.cookies.id}`;
  
  db.get(user_id).then((val) => {
    if(val !== null){
      let thread_ = [
      ];
      threads.threads.map((val, index) => {
        thread_[index] = {
          name: val,
          id: val
        }
      });
    
      res.render("./index.ejs", {
        threads: thread_,
        account: val
      });
    }
    else{
      let thread_ = [
      ];
      threads.threads.map((val, index) => {
        thread_[index] = {
          name: val,
          id: val
        }
      });
    
      res.render("./index.ejs", {
        threads: thread_,
        account: null
      });
    }
  });
});

app.get("/login", function(req, res) {
  res.render("./login.ejs", {
    status: "",
    redirect_uri: null
  });
});

app.get("/users/:user_id", (req, res) => {
  db.get('users' + req.params.user_id.toLowerCase()).then((val) => {
    if(val !== null){
      // res.send(val.id + 'さんのページです。');
      res.render("./users_page.ejs", {
        account: val
      });
    }
    else{
      res.send(req.params.user_id + 'さんは存在しません。');
    }
  });
});

app.get("/logout", function(req, res) {
  if(req.cookies.id !== null && req.cookies.password !== null){
    res.cookie("id", undefined);
    res.cookie("password", undefined);
    res.render("./logout.ejs", {
      status: "ログアウトに成功しました"
    });
  }
  else{
    res.render("./logout.ejs", {
      status: "ログインしてください"
    });
  }
});

app.get("/register", function(req, res) {
  res.render("./register.ejs", {
    status: ""
  });
});

app.get("/settings", (req, res) => {
  let user_id = `users${req.cookies.id}`;
  
  db.get(user_id).then((val) => {
    if(val !== null){
      if(!bcrypt.compareSync(req.cookies.password, val.password)){
        res.render("./login.ejs", {
          status: "設定を見るにはログインをしてください",
          redirect_uri: null
        });
      }
      else{
        if(val.api){
          res.render("./settings.ejs", {
            status: "",
            account: val,
            api_key: val.api.mf7cli.api_key
          });
        }
        else{
          res.render("./settings.ejs", {
            status: "",
            account: val,
            api_key: ""
          });
        }
      }
    }
    else{
      res.render("./login.ejs", {
        status: "設定を見るにはログインをしてください",
        redirect_uri: null
      });
    }
  });
});

app.get("/settings/get_api_key", (req, res) => {
  let user_id = `users${req.cookies.id}`;
  db.get(user_id).then((val) => {
    if(val !== null){
      if(bcrypt.compareSync(req.cookies.password, val.password)){
        api_key = Math.floor(Math.random() * (999 - 100) + 100);
        let user = {
          id:val["id"],
          password: val["password"],
          api: val["api"],
          email: val["email"],
          bio: val["bio"],
          link: val["link"],
          badge: val["badge"]
        }
        if(user.api === null || user.api === undefined) user.api = {mf7cli: {api_key: ""}};
        user.api.mf7cli.api_key = api_key;
        
        db.set(user_id, user).then(() => {
          console.log(val["id"] + "さんがAPIキーを生成しました。")
        });
        
        res.render("./settings.ejs", {
          status: "APIキーを生成しました",
          account: val,
          api_key: api_key
        });
      }
      else {
        if(val.api){
          res.render("./login.ejs", {
            status: "ログインしてください",
            redirect_uri: null
          });
        }
        else{
          res.render("./login.ejs", {
            status: "ログインしてください",
            redirect_uri: null
          });
        }
      }
    }
    else{
      res.render("./login.ejs", {
        status: "ログインしてください",
        redirect_uri: null
      });  
    }
  });
});

app.post("/settings/change_password", (req, res) => {
  let user_id = `users${req.cookies.id}`;
  db.get(user_id).then((val) => {
    if (val !== null) {
      if (bcrypt.compareSync(req.body["submit_password"], val.password) && req.body["submit_new_password"].length >= 5 && !bcrypt.compareSync(req.body["submit_new_password"], val.password)) {
        db.set(user_id, {
          id: req.cookies.id,
          password: bcrypt.hashSync(req.body["submit_new_password"], 10),
          // あとで直す
          api: {
            mf7cli: {
              api_key: val.api_key
            }
          },
          email: val["email"],
          bio: val["bio"],
          link: val["link"],
          badge: val["badge"]
        }).then(() => {
        });

        console.log(val["id"] + 'がパスワードを変更しました。');
        if(val.api){
          res.cookie('id', val["id"], { httpOnly: false });
          res.cookie('password', req.body["submit_new_password"], { httpOnly: false });
          
          res.render("./settings.ejs", {
            status: "パスワードの変更に成功しました",
            account: val,
            api_key: val.api.mf7cli.api_key
          });
        }
        else{
          res.cookie('id', val["id"], { httpOnly: false });
          res.cookie('password', req.body["submit_new_password"], { httpOnly: false });
          
          res.render("./settings.ejs", {
            status: "パスワードの変更に成功しました",
            account: val,
            api_key: ""
          });
        }
      }
      else if (!bcrypt.compareSync(req.cookies.password, val.password)) {
        if(val.api){
          res.render("./settings.ejs", {
            status: "パスワードが一致しません",
            account: val,
            api_key: val.api.mf7cli.api_key
          });
        }
        else{
          res.render("./settings.ejs", {
            status: "パスワードが一致しません",
            account: val,
            api_key: ""
          });
        }
      }
      else if (bcrypt.compareSync(req.body["submit_new_password"], val.password)) {
        if(val.api){
          res.render("./settings.ejs", {
            status: "新しいパスワードは現在のパスワードではないものを指定してください",
            account: val,
            api_key: val.api.mf7cli.api_key
          });
        }
        else{
          res.render("./settings.ejs", {
            status: "新しいパスワードは現在のパスワードではないものを指定してください",
            account: val,
            api_key: ""
          });
        }
      }
    }
    else if (val === null) {
      if(val.api){
        res.render("./login.ejs", {
          status: "ログインしてください",
          redirect_uri: null
        });
      }
      else{
        res.render("./login.ejs", {
          status: "ログインしてください",
          redirect_uri: null
        });
      }
    }
  });
});

app.post("/settings/change_email", async (req, res) => {
  if(email_pattern.test(req.body["submit_text"]) === true){
    let user_id = `users${req.cookies.id}`;
    let emailAuthQue = await db.get("emailauthque");
    let val = await db.get(user_id);
    if(emailAuthQue !== null && val !== null){
      
      if(emailAuthQue.length <= 5 && userlist_match(await get_userlist(), "email", req.body["submit_text"]) === 0){
        let date = new Date();
        
        emailAuthQue[emailAuthQue.length] = {
          email: req.body["submit_text"],
          token: uuidjs.generate(),
          date: date.setMinutes(date.getMinutes() + 10),
          id: req.cookies.id,
          password: bcrypt.hashSync(req.cookies.password, 10),
          link_exist: true
        }

        console.log("最新のトークン", emailAuthQue[emailAuthQue.length - 1].token)

        db.set("emailauthque",emailAuthQue).then(() => {
          console.log("登録時のキュー: ",emailAuthQue);
          console.log(req.cookies.id + 'がメールアドレスを登録しようとしています。');
          mailOptions.subject = '【重要】アカウントのメールアドレス登録の確認';
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
      }
      else if(userlist_match(await get_userlist(), "email", req.body["submit_text"]) >= 1){
        console.log(req.cookies.id + 'さんの入力したメールアドレスは既に使用されています。');
        if(val.api){
          res.render("./register.ejs", {
            status: "入力したメールアドレスは既に使用されています。"
          });
        }
        else{
          res.render("./register.ejs", {
            status: "入力したメールアドレスは既に使用されています。"
          });
        }
      }
      else if(emailAuthQue.length > 5) {
        console.log(req.cookies.id + 'が登録しようとしています。メール認証の最大件数を超えています。');
        if(val.api){
          res.render("./login.ejs", {
            // status: "登録に成功しました。\nログインしてください。"
            status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
            redirect_uri: "/settings"
          });
        }
        else{
          res.render("./login.ejs", {
            // status: "登録に成功しました。\nログインしてください。"
            status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
            redirect_uri: "/settings"
          });
        }
      }
      else if(val === null){
        console.log(req.cookies.id + 'さん、予期しないエラーが発生しました。');
        res.render("./login.ejs", {
          status: "予期しないエラーが発生しました。もう一度ログインしてください。",
          redirect_uri: "/settings"
        });
      }
      else{
        if(val.api){
          res.render("./settings.ejs", {
            status: "予期しないエラー",
            account: val,
            api_key: val.api.mf7cli.api_key
          });
        }
        else{
          res.render("./settings.ejs", {
            status: "予期しないエラー",
            account: val,
            api_key: ""
          });
        }
      }
    }
    else{
      console.log(req.cookies.id + 'さん、予期しないエラーが発生しました。');
      res.render("./login.ejs", {
        status: "予期しないエラーが発生しました。もう一度ログインしてください。",
        redirect_uri: "/settings"
      });
    }
  }
  else{
    console.log(req.cookies.id + 'さん、正しいメールアドレスを入力してください。');
    res.render("./settings.ejs", {
      status: "正しいメールアドレスを入力してください。",
      account: val,
      api_key: ""
    });
  }
});

app.get("/auth/:token", (req, res) => {
  db.get("emailauthque").then((val) => {
    if(val !== null){
      function checkToken(){
        let result = [];
        for(let i = 0; i <= val.length - 1; i++){
          console.log(i);
          console.log("auth_data_value: ", val[i]);
          if(val[i].token === req.params.token){
            result[result.length] = val[i];
          }
          if(i === val.length - 1){
            return result;
          }
        }
      }

      console.log(val[checkToken().length - 1]);      
      
      if(checkToken().length >= 1){
        if(val[checkToken().length - 1].link_exist === false){
          console.log("誰かがメールアドレス認証の画面にきたよ");
          res.render("./auth.ejs", {
            status: "",
            account: checkToken()[checkToken().length - 1]
          });
        }
        else{
          console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
          res.render("./register.ejs",{
            status: "Tokenが新規登録用の物だったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。"
          });
        }
      }
      else{
        console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
        res.render("./register.ejs",{
          status: "Tokenが存在しなかったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。"
        });
      }
    }
    else{
      console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。");
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1]
      });
    }
  });
});

app.get("/auth/exist/:token", (req, res) => {
  db.get("emailauthque").then((val) => {
    if(val !== null ){
      if(val.link_exist === false) return;
      function checkToken(){
        let result = [];
        for(let i = 0; i <= val.length - 1; i++){
          console.log(i);
          console.log("auth_data_value: ", val[i]);
          if(val[i].token === req.params.token){
            result[result.length] = val[i];
          }
          if(i === val.length - 1){
            return result;
          }
        }
      }
      console.log("一致したトークンの数: ",checkToken().length);
      if(checkToken().length >= 1){
        console.log("誰かがメールアドレス認証の画面にきたよ");
        res.render("./auth_exist.ejs", {
          status: "",
          account: checkToken()[checkToken().length - 1]
        });
      }
      else{
        console.log(checkToken().length, "誰かがメールアドレス認証に失敗したよ。トークンが存在しないよ。");
        res.render("./register.ejs",{
          status: "Tokenが存在しなかったため仮登録画面にリダイレクトされました。もしかしたら保存期間が過ぎたのかもしれません。"
        });
      }
    }
    else{
      console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。");
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1]
      });
    }
  });
});

app.post("/auth/exist/:token/auth", (req, res) => {
  db.get("emailauthque").then((val) => {
    if(val !== null){
      function checkToken(){
        let result = [];
        for(let i = 0; i <= val.length - 1; i++){
          console.log(i);
          console.log("auth_data_value: ", val[i]);
          if(val[i].token === req.params.token){
            result[result.length] = val[i];
          }
          if(i === val.length - 1){
            return result;
          }
        }
      }
      if(bcrypt.compareSync(req.body["submit_password"], checkToken()[checkToken().length - 1].password)){
        if(checkToken()[checkToken().length - 1].api){
          db.set(`users${checkToken()[checkToken().length - 1].id}`,{
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
        }
        else{
          let badge = checkToken()[checkToken().length - 1].badge;
          if(!badge) badge = [];
          badge[badge.length] = "メールアドレス登録者";
          db.set(`users${checkToken()[checkToken().length - 1].id}`,{
            id: checkToken()[checkToken().length - 1].id,
            password: checkToken()[checkToken().length - 1].password,
            api:{
              mf7cli: {
                api_key: ""
              }
            },
            email: checkToken()[checkToken().length - 1].email,
            bio: checkToken()[checkToken().length - 1].bio,
            link: checkToken()[checkToken().length - 1].link,
            badge: badge
          });
          res.render("./login.ejs", {
            status: "メールアドレスの登録が完了しました。",
            redirect_uri: "/"
          });
        }
      }
      else{
        console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。パスワードが違うみたいだね。");
        res.render("./auth.ejs", {
          status: "入力したパスワードと仮登録で使用したパスワードが一致しません。",
          account: checkToken()[checkToken().length - 1]
        });
      }
    }
    else{
      console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。");
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1]
      });
    }
  });
});

app.post("/auth/:token/auth", (req, res) => {
  db.get("emailauthque").then(async (val) => {
    function checkToken(){
      let result = [];
      for(let i = 0; i <= val.length - 1; i++){
        console.log(i);
        console.log("auth_data_value: ", val[i]);
        if(val[i].token === req.params.token){
          result[result.length] = val[i];
        }
        if(i === val.length - 1){
          return result;
        }
      }
    }
    if(val !== null && await userlist_match(await get_userlist(), "id", checkToken()[checkToken().length - 1].email) === 0){
      if(bcrypt.compareSync(req.body["submit_password"], checkToken()[checkToken().length - 1].password)){
        db.set(`users${checkToken()[checkToken().length - 1].id}`,{
          id: checkToken()[checkToken().length - 1].id,
          password: checkToken()[checkToken().length - 1].password,
          email: checkToken()[checkToken().length - 1].email,
          bio: checkToken()[checkToken().length - 1].bio,
          link: checkToken()[checkToken().length - 1].link,
          badge: ["メールアドレス登録者"]
        });
        res.render("./login.ejs", {
          status: "登録が完了しました。ログインしてください。",
          redirect_uri: null
        });
      }
      else{
        console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。パスワードが違うみたいだね。");
        res.render("./auth.ejs", {
          status: "入力したパスワードと仮登録で使用したパスワードが一致しません。",
          account: checkToken()[checkToken().length - 1]
        });
      }
    }
    else if(await userlist_match(await get_userlist(), "id", checkToken()[checkToken().length - 1].id) !== 0){
      console.log("a: ",checkToken()[checkToken().length - 1].id);
      
      res.render("./auth.ejs", {
        status: checkToken()[checkToken().length - 1].id + "は存在します。",
        account: checkToken()[checkToken().length - 1]
      });
    }
    else{
      console.log(checkToken()[checkToken().length - 1].id + "さんがメールアドレス認証に失敗したよ。予期せぬエラーが発生したみたいだ。");
      res.render("./auth.ejs", {
        status: "予期せぬエラーが発生しました。",
        account: checkToken()[checkToken().length - 1]
      });
    }
  });
});

app.post("/login", (req, res) => {
  let user_id = `users${req.body["submit_id"][0].toLowerCase()}`
  db.get(user_id).then((val) => {
    if (val !== null && req.body["submit_id"][0].length >= 5) {
      if (bcrypt.compareSync(req.body["submit_id"][1], val.password)) {
        console.log(req.body["submit_id"][0] + 'がログインしました');
        res.cookie("id", req.body["submit_id"][0].toLowerCase(), {
          maxAge: 3e+9,
          httpOnly: false
        });
        res.cookie("password", req.body["submit_id"][1], {
          maxAge: 3e+9,
          httpOnly: false
        });
        res.render("./login.ejs", {
          status: "ログインに成功しました。",
          redirect_uri: "/"
        });
      }
      else {
        console.log(req.body["submit_id"][0] + 'がログインに失敗しました。パスワードがDBのパスワードと一致しません。"');
        res.render("./login.ejs", {
          status: "ログインに失敗しました。パスワードがDBのパスワードと一致しません。",
          redirect_uri: null
        });
      }
    }
    else {
      console.log(req.body["submit_id"][0] + 'は存在しません');
      res.render("./login.ejs", {
        status: "ユーザーが存在しません。",
        redirect_uri: null
      });
    }
  });
});

app.post("/register", (req, res) => {
  console.log(req.body["submit_id"][0]);
  let user_id = `users${req.body["submit_id"][0].toLowerCase()}`
  db.get(user_id).then(async (val) => {
    
    db.list("users").then(async (matches) => {
      userlist = matches;
      console.log(userlist);

      if(val === null && req.body["submit_id"][0].length >= 5 && req.body["submit_id"][1].length >= 8 && isAlphabet(req.body["submit_id"][0])　&& req.body["submit_id"][0].length <= 15 && req.body["submit_id"][2] && email_pattern.test(req.body["submit_id"][2]) && await userlist_match(userlist, "email", req.body["submit_id"][2]) === 0 && await userlist_match(userlist, "id", req.body["submit_id"][0]) === 0) {
        console.log("一致したメールアドレス: ", await userlist_match(await get_userlist(), "email", req.body["submit_id"][2]))
        let emailAuthQue = await db.get("emailauthque");
        if(emailAuthQue !== null){
          console.log(emailAuthQue);
          if(emailAuthQue.length <= 5){
            let date = new Date();
            emailAuthQue[emailAuthQue.length] = {
              email: req.body["submit_id"][2],
              token: uuidjs.generate(),
              date: date.setMinutes(date.getMinutes() + 10),
              id: req.body["submit_id"][0],
              password: bcrypt.hashSync(req.body["submit_id"][1], 10),
              link_exist: false,
              ip: req.ip
            }
  
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
            
            db.set("emailauthque",emailAuthQue).then(() => {
              console.log(req.body["submit_id"][0] + 'が登録しようとしています');
            });
            mailOptions.subject = '【重要】アカウント登録の確認';
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
            console.log(req.body["submit_id"][0] + 'が登録しようとしています');
            res.render("./login.ejs", {
              status: "確認用メールを送信しました。",
              redirect_uri: "/"
            });
          }
          else{
            console.log(req.body["submit_id"][0] + 'が登録しようとしています。現在メール認証の最大件数を超えているためメールを送信できませんでした。');
            res.render("./login.ejs", {
              // status: "登録に成功しました。\nログインしてください。"
              status: "現在メール認証の最大件数を超えています。10分ほど経ってから再度送信してください。",
              redirect_uri: "/"
            });
          }
        }
        else{
          emailAuthQue = [];
          emailAuthQue[emailAuthQue.length] = {
            email: req.body["submit_id"][2],
            token: uuidjs.generate(),
            date: new Date(),
            id: req.body["submit_id"][0],
            password: bcrypt.hashSync(req.body["submit_id"][1], 10),
            link_exist: false
          }
  
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
  
          db.set("emailauthque",emailAuthQue).then(() => {
            console.log(req.body["submit_id"][0] + 'が登録しようとしています');
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
          </html>`
          transporter.sendMail(mailOptions);
          console.log(req.body["submit_id"][0] + 'が登録しようとしています');
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
      }
      else if (val !== null) {
        console.log(req.body["submit_id"][0] + 'は存在します');
        res.render("./register.ejs", {
          status: req.body["submit_id"][0] + "は存在します。別の名前を指定してください。"
        });
      }
      else if (req.body["submit_id"][0].length < 5 || req.body["submit_id"][1].length < 8 || req.body["submit_id"][0].length > 15) {
        console.log(req.body["submit_id"][0] + 'さん、要件を満たしていません。');
        res.render("./register.ejs", {
          status: "パスワードかIDが要件を満たしていません。"
        });
      }
      else if (!req.body["submit_id"][2] || !email_pattern.test(req.body["submit_id"][2])){
        console.log(req.body["submit_id"][0] + 'さん、要件を満たしていません。');
        res.render("./register.ejs", {
          status: "正しいメールアドレスを入力してください。"
        });
      }
      else if (await userlist_match(userlist, "email", req.body["submit_id"][2]) !== 0){
        console.log(req.body["submit_id"][0] + 'さんの入力したメールアドレスは既に使用されています。');
        console.log("リスト: ", userlist,"\n結果: ", await userlist_match(userlist, "email", req.body["submit_id"][2]));
        res.render("./register.ejs", {
          status: "入力したメールアドレスは既に使用されています。"
        });
      }
      else if (await userlist_match(userlist, "id", req.body["submit_id"][0]) !== 0){
        console.log(req.body["submit_id"][0] + 'さんの入力したIDは既に使用されています。');
        res.render("./register.ejs", {
          status: "入力したIDは既に使用されています。"
        });
      }
    });
  });
});

// スレッド一覧を取得
threads.threads.map(async (val, index) => {
  let db_id = `messages${val}`;

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

  app.get(`/${val}`, async (req, res) => {
    // 初期化
    let db_id = `messages${val}`;
    
    try{
      let messages_db = await db.get(db_id);
      if (messages_db === null || messages_db === undefined) {
        messages_db = {message:[]};
        messages_db["message"][0] = { id: 'system', text: `ここは${val}です。`, pinned: true };
        messages[val] = messages_db;
        console.log(messages);
  
        db.set(db_id, messages[val]);
        
        res.render("./thread.ejs", {
          thread: { name: val, id: val },
          message: messages[val]["message"],
          status: "",
          md: md
        });
      }
      else{
        messages[val] = messages_db;
        console.log(messages);
  
        db.set(db_id, messages[val]);
        
        res.render("./thread.ejs", {
          thread: { name: val, id: val },
          message: messages[val]["message"],
          status: "",
          md: md
        });
      }
    }
    catch(e){
      messages[val] = {message:[]};
      db.set(db_id, messages[val]);
    }
  });

  app.post(`/${val}/delete`, async (req, res) => {
    db.get(db_id).then(keys => {
      if (keys === null) {
        keys = {message:[]};
        keys["message"][0] = { id: 'system', text: `ここは${val}です。`, pinned: true };
      }

      messages[val] = keys;
      console.log(messages);
    
      db.set(db_id, messages[val]).then(() => {
      });  
    });

    let user_id;
    if(req.cookies.id){
      user_id = `users${req.cookies.id.toLowerCase()}`;
    }
    else{
      user_id = `users${req.cookies.id}`;
    }

    account = await db.get(user_id);
    if(account !== null){
      if(req.body["message_num"] !== undefined){
        // 0 - (逆にしたい数 - 全体の数)
        let msg_data = messages[val].message[0 - (req.body["message_num"] - (messages[val].message.length - 1))];

        if(msg_data !== null){
          if(msg_data.id === req.cookies.id.toLowerCase()){
            console.log(msg_data.id, "が", msg_data.text, "を削除しようとしています。");
            messages[val].message.splice(0 - (req.body["message_num"] - (messages[val].message.length - 1)), 1);
            
            db.set(db_id, messages[val]).then(() => {
            });
            
            res.redirect("/" + val);
          }
          else{
            console.log(msg_data.id, req.cookies.id.toLowerCase())
            res.render("./thread.ejs", {
              thread: { name: val, id: val },
              message: messages[val]["message"],
              status: "メッセージの削除は送信者と同じである必要があります。",
              md: md
            });
          }
        }
        else{
          res.render("./thread.ejs", {
            thread: { name: val, id: val },
            message: messages[val]["message"],
            status: "メッセージが存在しません。",
            md: md
          });
        }
      }
      else{
        res.render("./thread.ejs", {
          thread: { name: val, id: val },
          message: messages[val]["message"],
          status: "削除に必要なデータが存在しません。もう一度リクエストしてください。",
          md: md
        });
      }
    }
    else{
      res.render("./thread.ejs", {
        thread: { name: val, id: val },
        message: messages[val]["message"],
        status: "ログインしてください。",
        md: md
      });
    }
  });
  app.post(`/${val}`, async (req, res) => {
    db.get(db_id).then(keys => {
      if (keys === null) {
        keys = {message:[]};
        keys["message"][0] = { id: 'system', text: `ここは${val}です。`, pinned: true };
      }
      console.log(keys);
      messages[val] = keys;
      console.log(messages);

        db.set(db_id, messages[val]).then(() => {
        });  
    });

    let user_id;
    if(req.cookies.id){
      user_id = `users${req.cookies.id.toLowerCase()}`;
    }
    else{
      user_id = `users${req.cookies.id}`;
    }
    
    account = await db.get(user_id);
    if(account !== null){
      if (req.body.submit_text !== "" && messages[val].message.length < max_msg && req.cookies.id && req.cookies.password && bcrypt.compareSync(req.cookies.password, account["password"])) {
        db.get(db_id).then(keys => {
          if (keys === undefined) {
            keys["message"][0] = { id: 'system', text: `ここは${val}です。`, pinned: true };
          }
  
          messages[val] = keys;
  
          messages[val].message[messages[val].message.length] = {
            id: req.cookies.id.toLowerCase(),
            text: req.body.submit_text,
            pinned: false
          }
  
          db.set(db_id, messages[val]).then(() => {
          });
        });
  
        res.redirect(`/${val}`);
      }
      else if (req.body.submit_text == "") {
        db.get(db_id).then(keys => {
          messages[val] = keys;
          console.log(messages);
        });
  
        res.render("./thread.ejs", {
          thread: { name: val, id: val },
          message: messages[val]["message"],
          status: "メッセージを入力してください。",
          md: md
        });
      }
      else if (!req.cookies.id || !req.cookies.password) {
        db.get(db_id).then(keys => {
          messages[val] = keys;
          console.log(messages);
        });
  
        res.render("./thread.ejs", {
          thread: { name: val, id: val },
          message: messages[val]["message"],
          status: "ログインしてください。",
          md: md
        });
      }
      else if(!bcrypt.compareSync(req.cookies.password, account["password"])){
        db.get(db_id).then(keys => {
          messages[val] = keys;
          console.log(messages);
        });
  
        res.render("./thread.ejs", {
          thread: { name: val, id: val },
          message: messages[val]["message"],
          status: "CookieのパスワードがDBのパスワードと一致しません。\nもう一度ログインしてください。"
        }); 
      }
      else if (req.body.submit_id == "" || req.body.submit_id == 'anonymous' || req.body.submit_id == undefined || req.body.submit_id == 'system' || isAlphabet(req.body.submit_id) === false) {
        res.render("./thread.ejs", {
          thread: { name: val, id: val },
          // message: [
          //   {
          //     "id":"system",
          //     "text": "テスト",
          //     "pinned": true
          //   }
          // ]
          message: messages[val]["message"],
          status: "IDを入力してください。anonymous、system、半角英数字以外は使用できません。"
        });
      }
      else if (messages[val].message.length >= max_msg) {
        db.get(db_id).then(keys => {
          messages[val] = keys;
        });
  
        db.set(db_id, messages[val]).then(() => { });
  
        let i = 0;
  
        messages[val].message[messages[val].message.length] = {
          id: req.cookies.id,
          text: req.body.submit_text,
          pinned: false
        }
  
        function autoDeleteMessage() {
          if (messages[val].message[i].pinned == false) {
            messages[val].message.splice(i, 1);
          }
          else if (messages[val].message[i].pinned == true) {
            i += 1;
            autoDeleteMessage();
          }
        };
  
        autoDeleteMessage();
  
        db.set(db_id, messages[val]).then(() => { });
  
        res.render("./thread.ejs", {
          thread: { name: val, id: val },
          // message: [
          //   {
          //     "id":"system",
          //     "text": "テスト",
          //     "pinned": true
          //   }
          // ]
          message: messages[val]["message"],
          status: "メッセージ数が上限を超えているため古いメッセージを削除しました。",
          md: md
        });
      }
    }
    else{
      db.get(db_id).then(keys => {
        messages[val] = keys;
        console.log(messages);
      });

      res.render("./thread.ejs", {
        thread: { name: val, id: val },
        message: messages[val]["message"],
        status: "ログインしてください。",
        md: md
      });
    }
  });
});

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

app.get("/style/style.css", function(req, res) {
  res.sendFile(__dirname + '/views/style/style.css')
});

app.get("/image/default_icon", function(req, res) {
  res.sendFile(__dirname + '/views/image/default_icon.jpeg')
});

app.get("/tos", (req, res) => {
  res.sendFile(__dirname + '/views/tos.html');
});

app.get("/about", (req, res) => {
  res.sendFile(__dirname + '/views/about.html');
});

app.get("/image/logo_circle", (req, res) => {
  res.sendFile(__dirname + '/views/image/mf7cli-BBS_0520011046.png');
});

app.get("/image/logo", (req, res) => {
  res.sendFile(__dirname + '/views/image/mf7cli-BBS.png');
});

app.get("/favicon.ico", (req, res) => {
  res.sendFile(__dirname + '/views/favicon.ico');
});

app.get("/settings/profile", (req, res) => {
  let user_id = `users${req.cookies.id}`;
  
  db.get(user_id).then((val) => {
    if(val !== null){
      console.debug(bcrypt.compareSync(req.cookies.password, val.password));
      if(!bcrypt.compareSync(req.cookies.password, val.password)){
        res.render("./login.ejs", {
          status: "設定を見るにはログインをしてください",
          redirect_uri: null
        });
      }
      else{
        res.render("./settings_profile.ejs", {
          status: "",
          account: val
        });
      }
    }
    else{
      res.render("./login.ejs", {
        status: "設定を見るにはログインをしてください",
        redirect_uri: null
      });
    }
  });
});

app.post("/settings/profile/set_bio", (req, res) => {
  let user_id = `users${req.cookies.id}`;
  
  db.get(user_id).then((val) => {
    if(val !== null){
      console.debug(bcrypt.compareSync(req.cookies.password, val.password));
      if(!bcrypt.compareSync(req.cookies.password, val.password)){
        res.render("./login.ejs", {
          status: "設定を見るにはログインをしてください",
          redirect_uri: null
        });
      }
      else{
        console.log(req.body.submit_text);
        db.set(`users${val.id}`,{
          id: val.id,
          password: val.password,
          email: val.email,
          bio: req.body.submit_text,
          link: val.link
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

app.post("/settings/profile/set_link", (req, res) => {
  let user_id = `users${req.cookies.id}`;
  
  db.get(user_id).then((val) => {
    if(val !== null){
      console.debug(bcrypt.compareSync(req.cookies.password, val.password));
      if(!bcrypt.compareSync(req.cookies.password, val.password)){
        res.render("./login.ejs", {
          status: "設定を見るにはログインをしてください",
          redirect_uri: null
        });
      }
      else{
        console.log(req.body.submit_text);
        if(req.body.submit_text.slice(-1) === /,|\n/) req.body.submit_text.slice(0, -1);
        db.set(`users${val.id}`,{
          id: val.id,
          password: val.password,
          email: val.email,
          bio: val.bio,
          link: req.body.submit_text
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

app.use(function(req, res, next){
  res.status(404);
  res.render("./404.ejs", {
    status: req.path + "は存在しません。"
  })
});

app.use(function(err, req, res, next){
  res.status(500);
  res.end('500 error! : ' + err);
});

app.listen(3000, async () => {
  console.log("サーバーを起動しました");
  let user = await db.get("usersmf7cli");
  // user["password"] = bcrypt.hashSync("", 10);
  // db.set("usersmf7cli", user);
  // mailOptions.to = user.email;
  // mailOptions.subject = '【業務連絡】スペシャルトークンが生成されました。';
  // mailOptions.html = `
  // <html>
  //   <head>
  //     <link rel="stylesheet" type="text/css" href="https://bbs.mf7cli.tk/style/style.css"/>
  //     <title>【業務連絡】スペシャルトークンが生成されました。</title>
  //   </head>
  //   <body>
  //     <h1>【業務連絡】スペシャルトークンが生成されました。</h1>
  //     今回のスペシャルトークン: ${special_token.token}
  //   </body>
  // </html>`;
  // transporter.sendMail(mailOptions);
});