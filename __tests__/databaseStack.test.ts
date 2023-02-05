import { Testing } from "cdktf";
import { VpcStack } from "../stacks/vpc-stack";
import { DatabaseStack } from "../stacks/database-stack";
import { devConfig } from "../config/dev";

describe("vpcStack", () => {
  const app = Testing.app();
  const vpc = new VpcStack(app, "vpcStack", devConfig);
  const database = new DatabaseStack(app, "databaseStack", {
    config: devConfig,
    bastionSG: vpc.bastionSG,
    dbSG: vpc.dbSG,
    bastionSubnet: vpc.bastionSubnet,
    subnetIds: vpc.dbSubnetIds,
  });

  it("snapshot test for databaseStack", () => {
    expect(Testing.synth(database)).toMatchSnapshot();
  });
});
