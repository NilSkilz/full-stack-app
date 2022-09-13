import * as AWS from "aws-sdk";
import * as jwt from "jsonwebtoken";
import utils from "../utils";

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
});

export interface UserLogin {
  email: string;
  password: string;
}

export const handler = async function ({ body }: { body: string }) {
  const json = JSON.parse(body);

  let user;
  try {
    user = await getByEmail(json.email);
  } catch (error) {
    return {
      body: JSON.stringify([{ error: "Authentication failed." }]),
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    };
    // return res.status(404).send({ error: "Authentication failed." });
  }

  if (!user) {
    return {
      body: JSON.stringify([
        { error: "Authentication failed. User not found." },
      ]),
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    };
  }

  const hashedPassword = utils.hashPassword(json.password, user.salt);

  const isCorrect = hashedPassword === user.hash;
  if (!isCorrect) {
    return {
      body: JSON.stringify([
        { error: "Authentication failed. Wrong password." },
      ]),
      statusCode: 401,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    };
  }

  const token = jwt.sign(
    { hk: user.hk, sk: user.sk },
    process.env.TOKEN_SECRET!,
    {
      expiresIn: 604800, // 1 week
    }
  );

  return {
    body: JSON.stringify({ token }),
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
  };
};

const getByEmail = async (email: string) => {
  // Validate
  if (!email) {
    throw new Error(`"email" is required`);
  }
  if (!utils.validateEmailAddress(email)) {
    throw new Error(`"${email}" is not a valid email address`);
  }

  // Query
  const params = {
    TableName: process.env.USER_TABLE_NAME || "",
    KeyConditionExpression: "hk = :hk",
    ExpressionAttributeValues: { ":hk": email },
  };

  const result = await dynamodb.query(params).promise();

  const user = result.Items && result.Items[0] ? result.Items[0] : null;
  if (user) {
    user.id = user.sk2;
    user.email = user.hk;
  }
  return user;
};
