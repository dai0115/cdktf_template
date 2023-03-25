import { Testing } from "cdktf";
import { NetworkStack } from "../stacks/network-stack";
import { devConfig } from "../config/dev";

describe("networkStack", () => {
  it("snapshot test for vpcStack", () => {
    const app = Testing.app();
    const vpc = new NetworkStack(app, "networkStack", devConfig);
    expect(Testing.synth(vpc)).toMatchSnapshot();
  });
});
