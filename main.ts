import { App } from "cdktf";
import { VpcStack } from "./stacks/vpc-stack";
import { IamStack } from "./module/iam";

import { devConfig } from "./config/dev";

const app = new App();
new VpcStack(app, "vpcStack", devConfig);
new IamStack(app, "IamStack", devConfig);
app.synth();
