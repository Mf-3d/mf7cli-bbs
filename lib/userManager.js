const DBClient = require("@replit/database");

const db = new DBClient();

module.exports = {
  /** 
   * ユーザーデータを返します
   * @param {string} user_id
   */ async getUser(user_id) {
    const val = db.get("users" + user_id.toLowerCase());
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
      badge: val.badge
    };
  }
}