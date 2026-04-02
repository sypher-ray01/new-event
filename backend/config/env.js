const dotenv = require("dotenv");

dotenv.config();

const requiredVars = ["MONGODB_URI", "JWT_SECRET"];

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

module.exports = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || "30d",
  clientOrigin: process.env.CLIENT_ORIGIN || "*"
};
