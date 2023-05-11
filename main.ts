import { App } from "cdktf";

import { NetworkStack } from "./stacks/network-stack";
import { DatabaseStack } from "./stacks/database-stack";
import { BastionStack } from "./stacks/bastion-stack";
import { CognitoStack } from "./stacks/cognito-stack";
import { StaticWebsiteHostingStack } from "./stacks/staticWebsiteHosting-stack";
import { ComputingStack } from "./stacks/computing-stack";

import { devConfig } from "./config/dev"; // use GETCONFIG methods defined in config.ts to get the config

const app = new App();
const vpc = new NetworkStack(app, "networkStack", devConfig);
const database = new DatabaseStack(app, "databaseStack", {
  config: devConfig,
  dbSG: vpc.dbSG,
  dbSubnetIds: vpc.dbSubnetIds,
});
const cognito = new CognitoStack(app, "cognitoStack", {
  config: devConfig,
});
new BastionStack(app, "bastionStack", {
  config: devConfig,
});
new StaticWebsiteHostingStack(app, "staticWebsiteHostingStack", {
  config: devConfig,
});
new ComputingStack(app, "computingStack", {
  config: devConfig,
  ecsSG: vpc.ecsSG,
  ecsSubnetIds: vpc.ecsSubnetIds,
  targetG: vpc.targetG,
  targetG2: vpc.targetG2,
  albSG: vpc.albSG,
  albSubnetIds: vpc.albSubnetIds,
  albListener: vpc.albListener,
  cognitoId: cognito.cognitoId,
  rdsEndpoint: database.rdsEndpoint,
  rdsSecrets: database.rdsSecrets,
});
app.synth();
