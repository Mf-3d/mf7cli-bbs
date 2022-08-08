"use strict";

const serverConfig = require('../server_config.json');
const threads = JSON.parse(fs.readFileSync(__dirname + "/../data/threads/threads.json"));

const DBClient = require("@replit/database");
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

const db = new DBClient();
const io = require("socket.io")(server);

const md = require("markdown-it")({
  // 改行のあれ
  breaks: true,
  // リンクにするあれ
  linkify: true
}).use(require('markdown-it-highlightjs'));

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '/../views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieparser());
// 静的ファイル
app.use("/image", express.static(__dirname + "/views/image"));
app.use("/image/badges", express.static(__dirname + "/views/image/badges"));

app.use((req, res, next) => {
  if(req.originalUrl.slice(0, 6) === '/style' || req.originalUrl.slice(0, 6) === '/image') {
    next();
    return;
  }
  if(require('./server_config.json').maintenance === false) {
    next();
  } else {
    res.render('./maintenance.ejs', {});
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
  });
});

// Socket.IOにしない(多分)
app.get("/login", (req, res) => {
  if(req.query.callback) {
    if(!req.query.appName) {
      res.send('URLのパラメータが足りていません。');
      return;
    }
    res.render("./login_callback.ejs", {
      status: "",
      redirect_uri: null,
      query: {
        appName: req.query.appName,
        callback: req.query.callback
      }
    });
    
    return;
  }
  res.render("./login.ejs", {
    status: "",
    redirect_uri: null
  });
});

app.get("/users/", (req, res) => {
  res.render("./users_page_home.ejs", {});
});

// ユーザーページ
app.get("/users/:user_id", (req, res) => {
  db.get("users" + req.params.user_id.toLowerCase()).then((val) => {
    if (val !== null) {
      res.render("./users_page.ejs", {
        account: val
      });
    } else {
      res.send(req.params.user_id + "さんは存在しません。");
    }
  });
});

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

app.post('/api/v1/users/:user_id', async (req, res) => {
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

app.get("/register", (req, res) => {
  res.render("./register.ejs", {
    status: ""
  });
});