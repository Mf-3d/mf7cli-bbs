const express = require('express');
const userManager = require('../lib/userManager');
const fs = require('fs');
const bcrypt = require("bcrypt");
const DBClient = require("@replit/database");

let router = express.Router();
const threads = JSON.parse(fs.readFileSync(__dirname + "/../data/threads/threads.json"));
const db = new DBClient();

// ---------------------
// ユーザー情報を取得する系
// ---------------------

router.all('/user/get/:user_id/', async (req, res) => {
  const val = await userManager.getUser(req.params.user_id);
  if (val === null) {
    res.status(404);
    res.json({
      error: req.params.user_id + "さんは存在しません。"
    });
    return;
  }
  
  res.json(val);
});


router.post('/user/getHash/:user_id/', async (req, res) => {
  const user_id = `users${req.params.user_id.toLowerCase()}`;
  
  const val = await userManager.getUser(user_id);
  
  if (val === null) {
    res.status(404);
    res.json({
      error: req.params.user_id + "さんは存在しません。"
    });
    return;
  }

  if (val !== null && req.params.user_id.length >= 5) {
    let hash = userManager.getHash(req.params.user_id, req.body.password);
    
    if (!hash.error) {
      console.log(req.params.user_id + "がV2 APIで自身のユーザーデータを比較しました");
      res.json({
        status: 0,
        message: 'Password matched.',
        hash: hash.hash
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
  
  res.json(val);
});


router.get('/user/getHash/:user_id/', async (req, res) => {
  const user_id = `users${req.params.user_id.toLowerCase()}`;
  
  const val = await userManager.getUser(user_id);
  
  if (val === null) {
    res.status(404);
    res.json({
      error: req.params.user_id + "さんは存在しません。"
    });
    return;
  }

  if (val !== null && req.params.user_id.length >= 5) {
    let hash =　await userManager.getHash(req.params.user_id, req.query.password);
    
    if (!hash.error) {
      console.log(req.params.user_id + "がV2 APIで自身のユーザーデータを比較しました");
      res.json({
        status: 0,
        message: 'Password matched.',
        hash: hash.hash
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

// ---------------------
// スレッド情報を取得する系
// ---------------------

router.all('/thread/list', (req, res) => {
  const threadList = threads.threads.map((val) => ({
    name: val,
    id: val,
  }));

  res.json({
    threads: threadList
  });
});

// ---------------------
// ユーザー情報を編集する系
// ---------------------

router.get('/user/:user_id/badges/add/:badge_id', async (req, res) => {
  if (!req.query.apiUserId) {
    res.json({
      status: -1,
      message: 'A required query is missing. (apiUserId)'
    });

    return;
  }

  if (!req.query.apiUserPassword) {
    res.json({
      status: -1,
      message: 'A required query is missing. (apiUserPassword)'
    });

    return;
  }
  
  const apiUser = await db.get("users" + req.query.apiUserId.toLowerCase());

  if (apiUser.error) {
    res.json({
      status: -1,
      message: 'apiUser does not exist.'
    });
    
    return;
  }
  
  if (!apiUser.badge.includes('Admin')) {
    res.json({
      status: -1,
      message: 'Required badge for apiUser does not exist. (Admin)'
    });

    return;
  }

  if (!bcrypt.compareSync(req.query.apiUserPassword, apiUser.password)) {
    res.json({
      status: -1,
      message: 'Password of apiUser does not match.'
    });

    return;
  }

  const user = await userManager.getUser(req.params.user_id);

  if (user.error) {
    res.json({
      status: -1,
      message: 'User does not exist.'
    });
    
    return;
  }

  if (user.badge.includes(req.params.badge_id)) {
    res.json({
      status: 0,
      message: `The User is already given a "${req.params.badge_id}".`
    });

    return;
  }

  await userManager.addBadge(req.params.user_id, req.params.badge_id);
  
  res.json({
    status: 0
  });
});


router.get('/user/:user_id/badges/remove/:badge_id', async (req, res) => {
  if (!req.query.apiUserId) {
    res.json({
      status: -1,
      message: 'A required query is missing. (apiUserId)'
    });

    return;
  }

  if (!req.query.apiUserPassword) {
    res.json({
      status: -1,
      message: 'A required query is missing. (apiUserPassword)'
    });

    return;
  }
  
  const apiUser = await db.get("users" + req.query.apiUserId.toLowerCase());

  if (apiUser.error) {
    res.json({
      status: -1,
      message: 'apiUser does not exist.'
    });
    
    return;
  }
  
  if (!apiUser.badge.includes('Admin')) {
    res.json({
      status: -1,
      message: 'Required badge for apiUser does not exist. (Admin)'
    });

    return;
  }

  if (!bcrypt.compareSync(req.query.apiUserPassword, apiUser.password)) {
    res.json({
      status: -1,
      message: 'Password of apiUser does not match.'
    });

    return;
  }

  const user = await userManager.getUser(req.params.user_id);

  if (user.error) {
    res.json({
      status: -1,
      message: 'User does not exist.'
    });
    
    return;
  }

  if (!user.badge.includes(req.params.badge_id)) {
    res.json({
      status: 0,
      message: `User does not have a "${req.params.badge_id}".`
    });

    return;
  }

  await userManager.deleteBadge(req.params.user_id, req.params.badge_id);
  
  res.json({
    status: 0
  });
});

router.use((req, res) => {
  res.status(404);
  res.json({
    status: -2,
    message: 'This API does not exist.'
  });
});

module.exports = router;