# Full Stack App

A complete, serverless, full-stack application built on AWS Lambda, AWS REST API, React and DynamoDB.

It includes user login/register and saves passwords to a dynamoDB.

## Quick Start
---

Install the latest version of CDK:

`yarn add CDK -g`

Copy .env.sample to .env and change the variables as appropriate.

`cdk deploy --all`

If using a domain name from somewhere other than AWS, the deploy will most likely fail on creating certificates. 

Each time the stack is created it will generate new nameservers which need to be added to your domain name provider.
Hence, if the zone exists it will not be deleted/created.