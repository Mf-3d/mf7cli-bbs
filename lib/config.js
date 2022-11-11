const Conf = require('conf');

const config = new Conf();

module.exports = class {
  constructor () {}

  async set (key, value) {
    return config.set(key, value);
  }

  async get (key, defaultValue) {
    let data = config.get(key, defaultValue);

    if (!data) data = null;
    
    return data;
  }

  async delete (key) {
    return config.delete(key);
  }

  async list (prefix) {
    if (prefix) {
      let keys = [];
      let key;

      for (let key in config.store) {
        console.log(key)

        if (!key.startsWith(prefix)) continue;
        keys[keys.length] = key;
      }
    
      return keys;
    } else {
      console.log("b")
      let keys = [];
      for (let key in config.store) keys[keys.length] = key;
    
      return keys;
    }
  }
}