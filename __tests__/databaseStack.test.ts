import { Testing } from "cdktf";
import { NetworkStack } from "../stacks/network-stack";
import { DatabaseStack } from "../stacks/database-stack";
import { devConfig } from "../config/dev";

describe("databaseStack", () => {
  const app = Testing.app();
  const vpc = new NetworkStack(app, "networkStack", devConfig);
  const database = new DatabaseStack(app, "databaseStack", {
    config: devConfig,
    dbSG: vpc.dbSG,
    dbSubnetIds: vpc.dbSubnetIds,
  });

  it("snapshot test for databaseStack", () => {
    expect(Testing.synth(database)).toMatchSnapshot();
  });
});
