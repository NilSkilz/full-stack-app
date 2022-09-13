import * as AWS from "aws-sdk";
import * as shortid from "shortid";
import utils from "../utils";

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
});

export interface User {
  hk: string;
  sk: string;
  salt: string;
  hash: string;
  createdAt: number;
  updatedAt: number;
}

export const handler = async function ({ body }: { body: string }) {
  const user = JSON.parse(body);
  console.log(user);
  // Validate
  if (!user || !user.email) {
    return {
      body: JSON.stringify({ error: "'email' is required" }),
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    };
  }
  if (!user.password) {
    return {
      body: JSON.stringify({ error: "'password' is required" }),
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    };
  }
  if (!utils.validateEmailAddress(user.email)) {
    return {
      body: JSON.stringify({
        error: `'${user.email}' is not a valid email address`,
      }),
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    };
  }

  const salt = utils.generateSalt();

  const newUser: User = {
    hk: user.email,
    sk: shortid.generate(),
    salt,
    hash: utils.hashPassword(user.password, salt),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Check if user is already registered
  const existingUser = await getByEmail(user.email);
  if (existingUser) {
    return {
      body: JSON.stringify({
        error: `A user with email '${user.email}' is already registered`,
      }),
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    };
  }

  // Save
  const params = {
    TableName: process.env.USER_TABLE_NAME || "",
    Item: newUser,
  };

  const result = await dynamodb.put(params).promise();

  return {
    body: JSON.stringify({ success: true }),
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
  };
};

const getByEmail = async (email: string) => {
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
