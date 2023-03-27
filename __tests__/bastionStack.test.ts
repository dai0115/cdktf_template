import { Testing } from "cdktf";
import { NetworkStack } from "../stacks/network-stack";
import { BastionStack } from "../stacks/bastion-stack";
import { devConfig } from "../config/dev";

describe("bastionStack", () => {
  const app = Testing.app();
  const vpc = new NetworkStack(app, "networkStack", devConfig);
  const bastion = new BastionStack(app, "bastionStack", {
    config: devConfig,
    bastionSG: vpc.bastionSG,
    bastionSubnetId: vpc.bastionSubnetId,
  });

  it("snapshot test for bastionStack", () => {
    expect(Testing.synth(bastion)).toMatchSnapshot();
  });
});
