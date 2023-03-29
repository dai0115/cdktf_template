import { Testing } from "cdktf";
import { BastionStack } from "../stacks/bastion-stack";
import { devConfig } from "../config/dev";

describe("bastionStack", () => {
  const app = Testing.app();
  const bastion = new BastionStack(app, "bastionStack", {
    config: devConfig,
  });

  it("snapshot test for bastionStack", () => {
    expect(Testing.synth(bastion)).toMatchSnapshot();
  });
});
