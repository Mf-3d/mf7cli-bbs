const DBClient = require("@replit/database");

const db = new DBClient();

(async () => {
  await db.delete("undefined");
  console.log(await db.list());
  require("node:fs").writeFileSync(`${__dirname}/backup`, JSON.stringify(await db.getAll()));
})();