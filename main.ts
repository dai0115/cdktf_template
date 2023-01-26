import { App } from "cdktf";
import { VpcStack } from "./stacks/vpc-stack";

const app = new App();
new VpcStack(app, "vpcStack");
app.synth();
