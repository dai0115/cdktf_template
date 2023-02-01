import { App } from "cdktf";
import { VpcStack } from "./stacks/vpc-stack";
import { DatabaseStack } from "./stacks/database-stack";

import { devConfig } from "./config/dev";

const app = new App();
const vpc = new VpcStack(app, "vpcStack", devConfig);
new DatabaseStack(app, "DatabaseStack", {
  config: devConfig,
  securityGroup: vpc.bastionSG,
  bastionSubnet: vpc.bastionSubnet,
});
app.synth();
