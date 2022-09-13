import * as jwt from "jsonwebtoken";
import { UNAUTHORISED, SERVER_ERROR, SUCCESS } from "../utils";
import moment from "moment";

export const handler = async function (req) {
  try {
    console.log(req);

    const bearer = req.headers?.Authorization;

    if (!bearer) return UNAUTHORISED;

    const token = bearer.substring(7, bearer.length);
    const session = jwt.decode(token) as jwt.JwtPayload;

    if (!session || moment.unix(session.exp!).isBefore(moment()))
      return SUCCESS(session);

    return SUCCESS({ email: session.hk, id: session.sk });
  } catch (err) {
    console.log(err);
    return SERVER_ERROR;
  }
};

/**
 * Convert user record to public format
 * This hides the keys used for the dynamodb's single table design and returns human-readable properties.
 * @param {*} user
 */
// const convertToPublicFormat = (user = {}) => {
//   user.email = user.hk || null;
//   user.id = user.sk2 || null;
//   if (user.hk) delete user.hk;
//   if (user.sk) delete user.sk;
//   if (user.sk2) delete user.sk2;
//   if (user.password) delete user.password;
//   return user;
// };
