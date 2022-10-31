const serverConfig = require('../server_config.json');
const DBClient = require(serverConfig["config_module"]);
const bcrypt = require("bcrypt");
const userManager = require("./userManager");
const uuidjs = require("uuidjs");

const db = new DBClient();

module.exports = {
  authApp: async (appId, appSecret, userId, userPassword) => {
    const appUserHash = await userManager.getHash(userId, userPassword);

    if (appUserHash.error) {
      return {
        error: -1,
        message: "Failed to get app user hash."
      }
    }
    
    const appData = await db.get(`app.${appId}`);

    if (!appData) {
      return {
        error: -2,
        message: "This app does not exist."
      }
    }

    if (appSecret !== appData.auth.secret) {
      return {
        error: -3,
        message: "appSecret does not match."
      }
    }

    if (!appData.author) {
      return {
        error: -4,
        message: "The author of this app is unknown or does not exist."
      }
    }

    const appAuthor = await userManager.getUser(appData.author);

    if (!appAuthor) {
      return {
        error: -4,
        message: "The author of this app does not exist."
      }
    }

    if (appAuthor.badge.indexOf("Admin") === -1) {
      if (appAuthor.badge.indexOf("Coder") === -1) {
        return {  
          error: -5,
          message: "The author of this app does not currently have permission to operate."
        }
      }
    }

    const appUser = await userManager.getUser(userId);
    
    if (!appUser.usingApp) appUser.usingApp = [];

    appUser.usingApp[appUser.usingApp.length] = appId;

    await userManager.editUser(userId, appUser);
    
    return {
      userId,
      hash: appUserHash
    }
  },

  registerApp: async (appName, appAuthorId, appAuthorPassword) => {
    const appAuthor = await userManager.getUser(appAuthorId);

    if (!appAuthor) {
      return {
        error: -1,
        message: "The author of this app does not exist."
      }
    }
    
    const appUserHash = await userManager.getHash(appAuthorId, appAuthorPassword);

    if (appUserHash.error) {
      return {
        error: -2,
        message: "Failed to get app author hash."
      }
    }

    if (appAuthor.badge.indexOf("Admin") === -1) {
      if (appAuthor.badge.indexOf("Coder") === -1) {
        return {  
          error: -3,
          message: "The author of this app does not currently have permission to operate."
        }
      }
    }

    const appId = `${appAuthorId}.${appName}`;

    if (await db.get(`app.${appId}`)) {
      return {  
        error: -4,
        message: "App already exists."
      }
    }

    if (!appAuthor.app) appAuthor.app = [];

    appAuthor.app[appAuthor.app.length] = appId;

    const app = {
      id: appId,
      author: appAuthorId,
      name: appName,
      auth: {
        secret: uuidjs.generate()
      }
    }

    await userManager.editUser(appAuthorId, appAuthor);
    db.set(`app.${appId}`, app);


    return {
      id: appId,
      secret: app.auth.secret
    }
  },

  deleteApp: async (appId, appSecret) => {
    const appData = await db.get(`app.${appId}`);

    if (!appData) {
      return {
        error: -1,
        message: "This app does not exist."
      }
    }

    // if (appData.auth.secret !== appSecret) {
    //   return {
    //     error: -2,
    //     message: "App secret did not match."
    //   }
    // }

    db.delete(`app.${appId}`);
  }
}