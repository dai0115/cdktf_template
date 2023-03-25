import { App } from "cdktf";

import { NetworkStack } from "./stacks/network-stack";
import { DatabaseStack } from "./stacks/database-stack";

import { devConfig } from "./config/dev";

const app = new App();
const vpc = new NetworkStack(app, "networkStack", devConfig);
new DatabaseStack(app, "databaseStack", {
  config: devConfig,
  dbSG: vpc.dbSG,
  dbSubnetIds: vpc.dbSubnetIds,
});
app.synth();
