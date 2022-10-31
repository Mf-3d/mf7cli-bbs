const DBClient = require("@replit/database");
const bcrypt = require("bcrypt");

const db = new DBClient();

module.exports = {
  /** 
   * ユーザーデータを返します
   * @param {string} user_id
   */ async getUser(user_id) {
    /** @type {{ id: string; bio: string; link: string; icon: string; badge: string[]; app: string[]; usingApp: string; }} */
    
    const val = await db.get("users" + user_id.toLowerCase());
    if (val === null) {
      return {
        error: user_id + "さんは存在しません。"
      };
    }
    return {
      id: val.id,
      bio: val.bio,
      link: val.link,
      icon: val.icon,
      badge: val.badge,
      app: val.app,
      usingApp: val.usingApp
    };
  },

  /** 
   * ユーザーデータを上書きします
   * @param {string} user_id
   * @param {{ id: string; bio: string; link: string; icon: string; badge: string[]; app: string[]; usingApp: string; }} data
   */ async editUser(user_id, data) {
    const val = await db.get("users" + user_id.toLowerCase());
    if (val === null) {
      return {
        error: user_id + "さんは存在しません。"
      };
    }

    val.id = data.id;
    val.bio = data.bio;
    val.link = data.link;
    val.icon = data.icon;
    val.badge = data.badge;
    val.app = data.app;
    val.usingApp = data.usingApp;

    await db.set("users" + user_id.toLowerCase(), val);
    
    return {
      status: 0
    };
  },

  /** 
   * ユーザーのハッシュを返します
   * @param {string} user_id
   * @param {string} password
   */ async getHash(user_id, password) {
    if (!password) return {
      error: 'パスワードがありません'
    };
    const val = await db.get("users" + user_id.toLowerCase());
    if (val === null) {
      return {
        error: user_id + "さんは存在しません。"
      }
    }

    if (!bcrypt.compareSync(password, val.password)) {
      return {
        error: `パスワードが一致しません。`
      }
    }
    
    return {
      hash: val.password
    }
  },

    /** 
   * ユーザーのバッジを追加します
   * @param {string} user_id
   * @param {string} badge
   */ async addBadge (user_id, badge) {
    let user = await db.get("users" + user_id.toLowerCase());
    
    if (user === null) {
      return {
        error: user_id + "さんは存在しません。"
      }
    }

    user.badge[user.badge.length] = badge;

    await this.editUser(user_id, user);
  },

  /** 
   * ユーザーのバッジを削除します
   * @param {string} user_id
   * @param {string} badge
   */ async deleteBadge (user_id, badge) {
    let user = await db.get("users" + user_id.toLowerCase());
    
    if (user === null) {
      return {
        error: user_id + "さんは存在しません。"
      }
    }

    user.badge.splice(user.badge.indexOf(badge), 1);

    await this.editUser(user_id, user);
  },

  /** 
   * ユーザーのバッジを削除します
   * @param {string} user_id
   * @param {number} number
   */ async deleteBadgeByNumber (user_id, number) {
    let user = await db.get("users" + user_id.toLowerCase());
    
    if (user === null) {
      return {
        error: user_id + "さんは存在しません。"
      }
    }

    user.badge.splice(number, 1);

    await this.editUser(user_id, user);
  }
}