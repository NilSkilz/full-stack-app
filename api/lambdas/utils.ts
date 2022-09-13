/**
 * Utils
 */

const bcrypt = require("bcryptjs");

/**
 * Validate email address
 */
const validateEmailAddress = (email: string) => {
  var re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Generate salt
 */
const generateSalt = () => {
  return bcrypt.genSaltSync(10);
};

/**
 * Hash password
 * @param {*} password
 * @param {*} salt
 */
const hashPassword = (password: string, salt: string) => {
  return bcrypt.hashSync(password, salt);
};

/**
 * Compare password
 */
const comparePassword = (
  candidatePassword: string,
  trustedPassword: string
) => {
  return bcrypt.compareSync(candidatePassword, trustedPassword);
};

export default {
  // module.exports = {
  generateSalt,
  hashPassword,
  comparePassword,
  validateEmailAddress,
};

export const SERVER_ERROR = {
  body: JSON.stringify({ error: "Server Error" }),
  statusCode: 500,
  headers: {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  },
};

export const UNAUTHORISED = {
  body: JSON.stringify({ error: "Not Authorised" }),
  statusCode: 401,
  headers: {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  },
};

export const SUCCESS = (obj, statusCode = 200) => {
  return {
    body: JSON.stringify(obj),
    statusCode,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
  };
};
