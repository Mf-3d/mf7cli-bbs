const request = require('request');

module.exports = (url) => {
  return new Promise((resolve, reject) => {
    request(url, {
      method: 'GET'
    }, (error, response, body) => {
      resolve(body);
    });
  });
}