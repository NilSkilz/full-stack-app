const dotenv = require("dotenv");
dotenv.config();

export const AMAZON_ACCOUNT_NUMBER = process.env.AMAZON_ACCOUNT_NUMBER;
export const DOMAIN = process.env.DOMAIN!;
export const AMAZON_REGION = process.env.AMAZON_REGION;
export const APP_NAME = process.env.APP_NAME!;
export const TOKEN_SECRET = process.env.TOKEN_SECRET!;
