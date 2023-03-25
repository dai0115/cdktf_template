import { App } from "cdktf";

import { VpcStack } from "./stacks/network-stack";

import { devConfig } from "./config/dev";

const app = new App();
new VpcStack(app, "vpcStack", devConfig);
app.synth();
