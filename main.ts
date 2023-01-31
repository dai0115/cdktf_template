import { App } from "cdktf";
import { VpcStack } from "./stacks/vpc-stack";
import { DatabaseStack } from "./stacks/database-stack";

import { devConfig } from "./config/dev";

const app = new App();
new VpcStack(app, "vpcStack", devConfig);
new DatabaseStack(app, "DatabaseStack", devConfig);
app.synth();
