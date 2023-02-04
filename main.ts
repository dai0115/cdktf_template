import { App } from "cdktf";
import { VpcStack } from "./stacks/vpc-stack";
import { DatabaseStack } from "./stacks/database-stack";

import { devConfig } from "./config/dev";

const app = new App();
const vpc = new VpcStack(app, "vpcStack", devConfig);
new DatabaseStack(app, "databaseStack", {
  config: devConfig,
  bastionSG: vpc.bastionSG,
  dbSG: vpc.dbSG,
  bastionSubnet: vpc.bastionSubnet,
  subnetIds: vpc.dbSubnetIds,
});
app.synth();
