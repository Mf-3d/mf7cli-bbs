"use strict";

const fs = require("node:fs");
const DBClient = require("@replit/database");
const md = require("markdown-it")({
  // 改行のあれ
  breaks: true,
  // リンクにするあれ
  linkify: true
}).use(require('markdown-it-highlightjs'));

const db = new DBClient();

module.exports = {
  list: JSON.parse(fs.readFileSync(__dirname + "/../data/threads/threads.json")),
  get: async (id, start = 0, length = 'max') => {
    const db_id = `messages${id}`;
    
    let messages_db = await db.get(db_id);
    
    if (!messages_db) {
      messages_db = { message: [] };
      messages_db.message[0] = { id: "system", text: `ここは${id}です。`, pinned: true };
    }

    db.set(db_id, messages_db);
    
    let start_length = start;
    let load_length = length;
    
  
    if (load_length === 'max') {
      load_length = messages_db.message.length;
    }
  
    if (typeof start_length !== 'number' && start) {
      start_length = Number(start_length);
    }
    if (typeof load_length !== 'number' && start) {
      load_length = Number(load_length);
    }
    
    if (typeof start_length !== 'number' && !start) {
      start_length = 0;
    }
    
    if (typeof load_length !== 'number' && !length) {
      load_length = 10;
      if (messages_db.message.length - 1 < 10) {
        load_length = messages_db.message.length - 1;
      }
    }
  
    if (start_length > messages_db.message.length - 1) {
      start_length = messages_db.message.length - 1;
    }
  
    if (load_length > messages_db.message.length) {
      load_length = messages_db.message.length;
    }
  
    return messages_db.message.splice(-start_length, load_length);
  },
  
  getUsersThread: async (id, start = 0, length = 'max') => {
    const db_id = `users${id}`;

    let user = await db.get(db_id);

    if (!user) return [];
    let messages_db = user.log;
    
    if (!messages_db) {
      messages_db = { message: [] };
      user.log = messages_db;
    }

    db.set(db_id, user);
    
    let start_length = start;
    let load_length = length;
    
  
    if (load_length === 'max') {
      load_length = messages_db.message.length;
    }
  
    if (typeof start_length !== 'number' && start) {
      start_length = Number(start_length);
    }
    if (typeof load_length !== 'number' && start) {
      load_length = Number(load_length);
    }
    
    if (typeof start_length !== 'number' && !start) {
      start_length = 0;
    }
    
    if (typeof load_length !== 'number' && !length) {
      load_length = 10;
      if (messages_db.message.length - 1 < 10) {
        load_length = messages_db.message.length - 1;
      }
    }
  
    if (start_length > messages_db.message.length - 1) {
      start_length = messages_db.message.length - 1;
    }
  
    if (load_length > messages_db.message.length) {
      load_length = messages_db.message.length;
    }
  
    return messages_db.message.splice(-start_length, load_length);
  },

  
  setUsersThread: async (id, thread) => {
    if (!thread || typeof thread !== 'object') return;
    
    const db_id = `users${id}`;

    let user = await db.get(db_id);

    if (!user) return;
    
    
    if (!user.log) {
      user.log = { message: [] };
    }

    user.log = thread;
    
    db.set(db_id, user);
  }
}