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
    if (!prefix) {
        let keys = [];
      	for (let key in config.store) keys.push(key);
      
      	return keys;
    } else {
      let keys = [];
      for (let key in config.store) {
        if (!key.startsWith(prefix)) return;
        keys.push(key);
      }
    
      return keys;
    }
  }
}