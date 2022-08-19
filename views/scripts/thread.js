let browser;
const socket = io();

function copyToClipboard(text){
  // テキストコピー用の一時要素を作成
  const pre = document.createElement('pre');

  // テキストを選択可能にしてテキストセット
  pre.style.webkitUserSelect = 'auto';
  pre.style.userSelect = 'auto';
  pre.textContent = text;

  // 要素を追加、選択してクリップボードにコピー
  document.body.appendChild(pre);
  document.getSelection().selectAllChildren(pre);
  const result = document.execCommand('copy');

  // 要素を削除
  document.body.removeChild(pre);

  return result;
}

function submit() {
  // document.getElementById("login_form").submit();
  twemoji.parse(document.body);
  
  socket.emit("post-msg", {
    thread: {
      id: "<%= thread.name %>"
    },
    user: {
      id: Cookies.get("id"),
      password: Cookies.get("password")
    },
    msg: {
      text: document.getElementById("submit_text0").value
    }
  });

  document.getElementById("submit_text0").value = "";
}

let connected = false;
var socket_connect = io.connect();

socket_connect.on('connect', function(socket) {
  connected = true;
  console.log("connected!")
});

socket_connect.on('disconnect', function(data) {
  connected = false;
});

window.addEventListener('DOMContentLoaded', (event) => {
  function isIe() {
    var ua = navigator.userAgent;
    return ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;
  }

  if(isIe()){
    location.href = "https://www.google.com";
  }
});

window.addEventListener('focus', () => {
  socket.emit("woke-up", {
    thread: {id: "<%= thread.name %>"}
  });
  console.log("focusされました。");
});

window.onload = () => {
  let userAgent = window.navigator.userAgent.toLowerCase();

  if(userAgent.indexOf('msie') != -1 || userAgent.indexOf('trident') != -1) {
    console.log('mf7cli-BBS for Web (Browser: Internet Explorer)');
    browser = "msie";
    document.getElementById("status").innerHTML = "Internet Explorerではこのサービスを使用できません。Googleに3秒後にリダイレクトされます。";
    document.getElementById("submit_button").disabled = true;
    console.warn("このサービスはInternet Explorerをサポートしておりません。\nサポートを受けるには他のブラウザを使用して下さい。");
    setTimeout(() => {
      location.href = "https://www.google.com";
    }, 3000);
  } else if(userAgent.indexOf('edg') != -1) {
    console.log('mf7cli-BBS for Web (Browser: Edge)');
    browser = "edge";
    const status_message = document.getElementById("status");
    console.warn("このサービスはMicrosoft Edgeをサポートしておりません。\nサポートを受けるには他のブラウザを使用して下さい。");
  } else if(userAgent.indexOf('chrome') != -1) {
    console.log('mf7cli-BBS for Web (Browser: Chrome)');
    browser = "chrome";
  } else if(userAgent.indexOf('safari') != -1) {
    console.log('mf7cli-BBS for Web (Browser: Safari)');
    browser = "safari";
  } else if(userAgent.indexOf('firefox') != -1) {
    console.log('mf7cli-BBS for Web (Browser: Firefox)');
    browser = "firefox";
  } else if(userAgent.indexOf('opera') != -1) {
    console.log('mf7cli-BBS for Web (Browser: Opera)');
    browser = "opera";
    console.warn("このサービスはOperaをサポートしておりません。\nサポートを受けるには他のブラウザを使用して下さい。");
  } else {
    console.log('mf7cli-BBS for Web (Browser: Unknown)');
    browser = "unknown";
    console.warn("このサービスはこのブラウザをサポートしておりません。\nサポートを受けるには他のブラウザを使用して下さい。");
  }
  
  socket.emit("init", {
    thread: {id: "<%= thread.name %>"}
  });
  
  // function reconnectSocket() {
  //   if (!connected) {
  //     fetch("/ping", {})
  //     .then(function(res){
  //       window.location.href = unescape(window.location.pathname);
  //     }) // ajax成功時
  //     .then(function(err){})
  //   }
  // }

  // setInterval(reconnectSocket(), 200000);
  
  socket.on("update_status", (msg) => {
    const status_message = document.getElementById("status");
    status_message.innerHTML = `${msg.text}`;
  });

  socket.on("update-rss", (rss) => {
    const rss_list = document.getElementById('rss_list');
    rss_list.innerHTML = '';
    for (let i = 0; i < rss.length; i++) {
      let li = document.createElement("li");
      li.innerHTML = `<a href="${rss[i].link}">${rss[i].title}</a>`;
      rss_list.prepend(li);
    }
  });

  socket.on("update_all_messages", (data) => {
    const spinner = document.getElementsByClassName('loader-wrap')[0];
    spinner.classList.add('loaded');
    
    if(data.thread.id === '<%= thread.name %>'){
      const messages = document.getElementById("messages");
      messages.innerHTML = ``;
      document.getElementById('messageLength').innerHTML = data.message.length;
      for (let i = 0; i < data.message.length; i++) {
        const li = document.createElement("li");
        const date = new Date(data.message[i].date);
        let min;
        // date.setHours(date.getHours() + 9);
        if(String(date.getMinutes()).length === 1){
          min = "0" + date.getMinutes();
        }
        else{
          min =  date.getMinutes();
        }
        li.innerHTML = `
        <div class="id">
          <a href="/users/${data.message[i].id}">@${data.message[i].id}</a>
          <br/>
          <img src="/users/${data.message[i].id}/icon"/>
        </div>
        <div class="text"></div>
          <div class="msg_menu">
            <nav class="div-menu-nav">
              <div class="menu-tab menu-hover1"><a class="menu-click">&nbsp;</a></div>
              <div class="box1">
                <div>
                  <a class="delete_button">🗑削除</a>
                  <a href="javascript:copyToClipboard('https://bbs.mf7cli.tk/thread/<%= thread.id %>#${i}')">🗒リンクをコピー</a>
                </div>                      
                <div style="font-size: 12px; margin: 0.5em;" class="date">
                  <br/>
                  送信された日時: ${date.getFullYear()} %>/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${min}
                </div>   
              </div>
            </nav>
          </div>
        </div>`;
        li.querySelector('.text').insertAdjacentHTML('afterbegin', data.message[i].text);
        messages.prepend(li);
        twemoji.parse(document.body);
      }
    }

    lists = Array.from(document.querySelectorAll(".menu-click"));  
    lists2 = Array.from(document.querySelectorAll(".box1 .delete_button"));
    lists.forEach((elm) => {
      elm.addEventListener("click", () => {
        if(opened_index === undefined || opened_index !== [].slice.call(lists).indexOf(elm)){
          let lists2 = document.querySelectorAll('.menu-hover1');
          opened_index = [].slice.call(lists).indexOf(elm);
          console.log(opened_index);
          if(document.getElementsByClassName("clicked")[0] !== undefined && document.getElementsByClassName("clicked")[0] !== undefined){ 
            document.getElementsByClassName("clicked")[0].classList.remove('clicked');
            document.getElementsByClassName("clicked")[0].classList.remove('clicked');
          }
          elm.classList.toggle('clicked');
          lists2[opened_index].classList.toggle('clicked');
        }
        else{
          let lists2 = document.querySelectorAll('.menu-hover1');
          console.log(opened_index);
          lists[opened_index].classList.remove('clicked');
          lists2[opened_index].classList.remove('clicked');
          opened_index = undefined;
        }
      });
    });

    lists2.forEach((elm) => {
      elm.addEventListener("click", () => {
        index = [].slice.call(lists2).indexOf(elm);
        console.log(index);
        socket.emit("delete-msg", {
          thread: {
            id: "<%= thread.name %>",
            delete_msg_id: index
          },
          user: {
            id: Cookies.get("id"),
            password: Cookies.get("password")
          },
        });
        // post('/thread/<%= thread.name %>/delete', {message_num: index})
      });
    });
  });

  let i = 0;
  
  let lists = Array.from(document.querySelectorAll(".menu-click"));
  let lists2 = Array.from(document.querySelectorAll(".box1 .delete_button"));

  socket.on("update_messages", (data)　=>　{
    if(data.thread.id === '<%= thread.name %>') {
      const messages = document.getElementById("messages");
      const li = document.createElement("li");
      const date = new Date(data.message.date);
      let min;
      date.setHours(date.getHours() + 9);
      if(String(date.getMinutes()).length === 1){
        min = "0" + date.getMinutes();
      }
      else{
        min =  date.getMinutes();
      }
      li.innerHTML = `<div class="id">
        <a href="/users/${data.user.id}">@${data.user.id}</a>
        <br/>
        <img src="${data.user.icon}"/>
      </div>
      <div class="text">${data.message.text}</div>
        <div class="msg_menu">
          <nav class="div-menu-nav">
            <div class="menu-tab menu-hover1"><a class="menu-click">&nbsp;</a></div>
            <div class="box1">
              <div>
                <a class="delete_button">🗑削除</a>
                <a href="javascript:copyToClipboard('https://bbs.mf7cli.tk/thread/<%= thread.id %>#<%= i %>')">🗒リンクをコピー</a>
              </div>                      
              <div style="font-size: 12px; margin: 0.5em;" class="date">
                <br/>
                送信された日時: ${date.getFullYear()} %>/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${min}
              </div>   
            </div>
          </nav>
        </div>
      </div>`;
      messages.prepend(li);
      twemoji.parse(document.body);
      lists = Array.from(document.querySelectorAll(".menu-click"));  
      lists2 = Array.from(document.querySelectorAll(".box1 .delete_button"));
      lists.forEach((elm) => {
        elm.addEventListener("click", () => {
          if(opened_index === undefined || opened_index !== [].slice.call(lists).indexOf(elm)){
            let lists2 = document.querySelectorAll('.menu-hover1');
            opened_index = [].slice.call(lists).indexOf(elm);
            console.log(opened_index);
            if(document.getElementsByClassName("clicked")[0] !== undefined && document.getElementsByClassName("clicked")[0] !== undefined){ 
              document.getElementsByClassName("clicked")[0].classList.remove('clicked');
              document.getElementsByClassName("clicked")[0].classList.remove('clicked');
            }
            elm.classList.toggle('clicked');
            lists2[opened_index].classList.toggle('clicked');
          }
          else{
            let lists2 = document.querySelectorAll('.menu-hover1');
            console.log(opened_index);
            lists[opened_index].classList.remove('clicked');
            lists2[opened_index].classList.remove('clicked');
            opened_index = undefined;
          }
        });
      });

      lists2.forEach((elm) => {
        elm.addEventListener("click", () => {
          index = [].slice.call(lists2).indexOf(elm);
          console.log(index);
          socket.emit("delete-msg", {
            thread: {
              id: "<%= thread.name %>",
              delete_msg_id: index
            },
            user: {
              id: Cookies.get("id"),
              password: Cookies.get("password")
            },
          });
        });
      });
      window.removeEventListener('focus', function(){
        var faviconTag = document.querySelector('link[rel="icon"]');
        faviconTag.href = "/favicon.ico";
        window.removeEventListener('focus', function(){
          var faviconTag = document.querySelector('link[rel="icon"]');
          faviconTag.href = "/favicon.ico";
        });
        i = 0;
      });
      

      if(data.user.id !== Cookies.get("id")){
        i += 1;
        generate_notification_favicon("/image/logo_circle", i);  
      }
      
      window.addEventListener('focus', function(){
        var faviconTag = document.querySelector('link[rel="icon"]');
        faviconTag.href = "/favicon.ico";
        window.removeEventListener('focus', function(){
          var faviconTag = document.querySelector('link[rel="icon"]');
          faviconTag.href = "/favicon.ico";
        });
        
        i = 0;
      });
    }
    else{
      console.log(data.thread.id);
    }
  });
  
  twemoji.parse(document.body);
  document.body.classList.remove("preload");

  let opened_index = undefined;
  
  let crruent_messages;
  let latest_messages;

  fetch('/api/v1/thread/<%= thread.name %>/')
  .then(response => response.json())
  .then(data => {
    crruent_messages = data;
  });

  // fetch('/api/thread/<%= thread.name %>/')
  // .then(response => response.json())
  // .then((data) => {
  //   latest_messages = data;
    
  //   if(JSON.stringify(crruent_messages.message) !== JSON.stringify(latest_messages.message)){
  //     reload_icon();
  //   }
  //   else{
  //     var faviconTag = document.querySelector('link[rel="icon"]');
  //     faviconTag.href = "/favicon.ico";
  //   }
  // });

  function generate_notification_favicon(favicon, num) {
    if(num < 0) {return}
    else{
      // canvasの準備
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      // 元にするfaviconの読み込み
      var img = new Image();
      img.onload = function() {
          // canvasに元のfaviconを描画
          var w = img.width;
          var h = img.height;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0);
    
          // 通知数部分の描画
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(w*0.4, h*0.4, w*0.6, h*0.6);
          ctx.font = 'bold ' + w*0.5 + 'px MS PGothic';
          ctx.textAlign = 'center';
          ctx.textBaseline  = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(num, w*0.7, h*0.7);
    
          // 生成したfaviconを変換して設定
          var url = canvas.toDataURL('image/png');
          var faviconTag = document.querySelector('link[rel="icon"]');
          faviconTag.href = url;
      }
      img.src = favicon;  
    }
}
  
  lists.forEach((elm) => {
    elm.addEventListener("click", () => {
      if(opened_index === undefined || opened_index !== [].slice.call(lists).indexOf(elm)){
        let lists2 = document.querySelectorAll('.menu-hover1');
        opened_index = [].slice.call(lists).indexOf(elm);
        console.log(opened_index);
        if(document.getElementsByClassName("clicked")[0] !== undefined && document.getElementsByClassName("clicked")[0] !== undefined){ 
          document.getElementsByClassName("clicked")[0].classList.remove('clicked');
          document.getElementsByClassName("clicked")[0].classList.remove('clicked');
        }
        elm.classList.toggle('clicked');
        lists2[opened_index].classList.toggle('clicked');
      }
      else{
        let lists2 = document.querySelectorAll('.menu-hover1');
        console.log(opened_index);
        lists[opened_index].classList.remove('clicked');
        lists2[opened_index].classList.remove('clicked');
        opened_index = undefined;
      }
    });
  });

  lists2.forEach((elm) => {
    elm.addEventListener("click", () => {
      index = [].slice.call(lists2).indexOf(elm);
      console.log(index);
      socket.emit("delete-msg", {
        thread: {
          id: "<%= thread.name %>",
          delete_msg_id: index
        },
        user: {
          id: Cookies.get("id"),
          password: Cookies.get("password")
        },
      });
    });
  });



  function post(path, params, method='post') {
    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    const form = document.createElement('form');
    form.method = method;
    form.action = path;

    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.name = key;
        hiddenField.value = params[key];

        form.appendChild(hiddenField);
      }
    }

    document.body.appendChild(form);
    form.submit();
  }
}