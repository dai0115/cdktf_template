import { App } from "cdktf";

import { NetworkStack } from "./stacks/network-stack";

import { devConfig } from "./config/dev";

const app = new App();
const vpc = new NetworkStack(app, "networkStack", devConfig);
app.synth();
