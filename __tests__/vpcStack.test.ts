import { Testing } from "cdktf";
import { VpcStack } from "../stacks/vpc-stack";
import { devConfig } from "../config/dev";

describe("vpcStack", () => {
  const app = Testing.app();
  const vpc = new VpcStack(app, "vpcStack", devConfig);

  it("snapshot test for vpcStack", () => {
    expect(Testing.synth(vpc)).toMatchSnapshot();
  });
});
