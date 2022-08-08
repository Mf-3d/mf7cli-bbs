const DBClient = require("@replit/database");
const db = new DBClient();
const http = require("node:http");
const fs = require("node:fs");
const bodyParser = require("body-parser");
const DBClient = require("@replit/database");

const app = express();
const server = new http.Server(app);