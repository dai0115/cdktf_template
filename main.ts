import { App } from "cdktf";

import { NetworkStack } from "./stacks/network-stack";
import { DatabaseStack } from "./stacks/database-stack";
import { BastionStack } from "./stacks/bastion-stack";

import { devConfig } from "./config/dev";

const app = new App();
const vpc = new NetworkStack(app, "networkStack", devConfig);
new DatabaseStack(app, "databaseStack", {
  config: devConfig,
  dbSG: vpc.dbSG,
  dbSubnetIds: vpc.dbSubnetIds,
});
new BastionStack(app, "bastionStack", {
  config: devConfig,
  bastionSG: vpc.bastionSG,
  bastionSubnetId: vpc.bastionSubnetId,
});
app.synth();
