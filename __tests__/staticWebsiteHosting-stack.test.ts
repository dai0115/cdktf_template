import { Testing } from "cdktf";
import { devConfig } from "../config/dev";
import { StaticWebsiteHostingStack } from "../stacks/staticWebsiteHosting-stack";

describe("staticWebsiteHostingStack", () => {
  it("snapshot test for staticWebsiteHostingStack", () => {
    const app = Testing.app();
    const staticWebsiteHosting = new StaticWebsiteHostingStack(
      app,
      "staticWebsiteHostingStack",
      {
        config: devConfig,
      }
    );
    expect(Testing.synth(staticWebsiteHosting)).toMatchSnapshot();
  });
});
