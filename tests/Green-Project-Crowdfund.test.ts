
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;
const deployer = accounts.get("deployer")!;

const contractName = "Green-Project-Crowdfund";

/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/stacks/clarinet-js-sdk
*/

describe("example tests", () => {
  it("ensures simnet is well initialised", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  // it("shows an example", () => {
  //   const { result } = simnet.callReadOnlyFn("counter", "get-counter", [], address1);
  //   expect(result).toBeUint(0);
  // });
});

describe("Project Rating System", () => {
  // Helper function to create a project, fund it, and claim funds
  const setupCompletedProject = () => {
    // Create project
    const projectResult = simnet.callPublicFn(
      contractName,
      "create-project",
      [
        Cl.stringAscii("Test Green Project"),
        Cl.stringAscii("A test project for rating"),
        Cl.uint(1000000), // goal: 1 STX
        Cl.uint(100), // duration: 100 blocks
        Cl.stringAscii("Environment")
      ],
      deployer
    );
    const projectId = (projectResult.result as any).value.value;
    expect(projectResult.result).toBeOk(Cl.uint(projectId));

    // Contribute to project (address1 and address2)
    const contrib1 = simnet.callPublicFn(
      contractName,
      "contribute",
      [Cl.uint(projectId), Cl.uint(600000)], // 0.6 STX
      address1
    );
    expect(contrib1.result).toBeOk(Cl.uint(600000));

    const contrib2 = simnet.callPublicFn(
      contractName,
      "contribute",
      [Cl.uint(projectId), Cl.uint(400000)], // 0.4 STX
      address2
    );
    expect(contrib2.result).toBeOk(Cl.uint(400000));

    // Advance blocks to end funding period
    simnet.mineEmptyBlocks(101);

    // Claim funds to mark project as complete
    const claimResult = simnet.callPublicFn(
      contractName,
      "claim-funds",
      [Cl.uint(projectId)],
      deployer
    );
    expect(claimResult.result).toBeOk(Cl.bool(true));

    return { projectId, contributors: [address1, address2] };
  };

  it("should allow contributors to rate completed projects", () => {
    const { projectId, contributors } = setupCompletedProject();

    // Contributor 1 rates the project
    const rateResult = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(5)],
      contributors[0]
    );
    expect(rateResult.result).toBeOk(Cl.bool(true));

    // Check that rating was stored
    const userRating = simnet.callReadOnlyFn(
      contractName,
      "get-user-rating",
      [Cl.uint(projectId), Cl.principal(contributors[0])],
      contributors[0]
    );
    expect(userRating.result).toBeSome(Cl.uint(5));

    // Check project rating stats
    const projectRating = simnet.callReadOnlyFn(
      contractName,
      "get-project-rating",
      [Cl.uint(projectId)],
      contributors[0]
    );
    expect(projectRating.result).toBeOk(Cl.tuple({
      total: Cl.uint(1),
      sum: Cl.uint(5)
    }));
  });

  it("should reject ratings from non-contributors", () => {
    const { projectId } = setupCompletedProject();

    // Non-contributor tries to rate
    const rateResult = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(4)],
      address3 // address3 did not contribute
    );
    expect(rateResult.result).toBeErr(Cl.uint(115)); // err-not-contributor
  });

  it("should reject ratings on incomplete projects", () => {
    // Create project but don't complete it
    const projectResult = simnet.callPublicFn(
      contractName,
      "create-project",
      [
        Cl.stringAscii("Incomplete Project"),
        Cl.stringAscii("This project won't be completed"),
        Cl.uint(1000000),
        Cl.uint(100),
        Cl.stringAscii("Environment")
      ],
      deployer
    );
    const projectId = (projectResult.result as any).value.value;
    expect(projectResult.result).toBeOk(Cl.uint(projectId));

    // Contribute but don't claim funds
    const contrib = simnet.callPublicFn(
      contractName,
      "contribute",
      [Cl.uint(projectId), Cl.uint(1000000)],
      address1
    );
    expect(contrib.result).toBeOk(Cl.uint(1000000));

    // Try to rate before completion
    const rateResult = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(4)],
      address1
    );
    expect(rateResult.result).toBeErr(Cl.uint(116)); // err-project-not-complete
  });

  it("should reject invalid ratings (outside 1-5 range)", () => {
    const { projectId, contributors } = setupCompletedProject();

    // Try to rate with 0
    const rateResult1 = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(0)],
      contributors[0]
    );
    expect(rateResult1.result).toBeErr(Cl.uint(114)); // err-invalid-rating

    // Try to rate with 6
    const rateResult2 = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(6)],
      contributors[0]
    );
    expect(rateResult2.result).toBeErr(Cl.uint(114)); // err-invalid-rating
  });

  it("should reject duplicate ratings from the same user", () => {
    const { projectId, contributors } = setupCompletedProject();

    // First rating should succeed
    const rateResult1 = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(4)],
      contributors[0]
    );
    expect(rateResult1.result).toBeOk(Cl.bool(true));

    // Second rating from same user should fail
    const rateResult2 = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(5)],
      contributors[0]
    );
    expect(rateResult2.result).toBeErr(Cl.uint(117)); // err-already-rated
  });

  it("should calculate correct average ratings", () => {
    const { projectId, contributors } = setupCompletedProject();

    // Contributor 1 rates 4 stars
    const rate1 = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(4)],
      contributors[0]
    );
    expect(rate1.result).toBeOk(Cl.bool(true));

    // Contributor 2 rates 5 stars
    const rate2 = simnet.callPublicFn(
      contractName,
      "rate-project",
      [Cl.uint(projectId), Cl.uint(5)],
      contributors[1]
    );
    expect(rate2.result).toBeOk(Cl.bool(true));

    // Check final stats
    const projectRating = simnet.callReadOnlyFn(
      contractName,
      "get-project-rating",
      [Cl.uint(projectId)],
      address1
    );
    expect(projectRating.result).toBeOk(Cl.tuple({
      total: Cl.uint(2),
      sum: Cl.uint(9) // 4 + 5
    }));

    // Check average (scaled by 100): (4+5)/2 * 100 = 450
    const avgRating = simnet.callReadOnlyFn(
      contractName,
      "get-project-average-rating",
      [Cl.uint(projectId)],
      address1
    );
    expect(avgRating.result).toBeOk(Cl.uint(450)); // 4.5 stars * 100
  });

  it("should return none for users who haven't rated", () => {
    const { projectId, contributors } = setupCompletedProject();

    // Check rating for user who hasn't rated
    const userRating = simnet.callReadOnlyFn(
      contractName,
      "get-user-rating",
      [Cl.uint(projectId), Cl.principal(contributors[0])],
      contributors[0]
    );
    expect(userRating.result).toBeNone();
  });

  it("should return error for average of project with no ratings", () => {
    const { projectId } = setupCompletedProject();

    // Check average for project with no ratings
    const avgRating = simnet.callReadOnlyFn(
      contractName,
      "get-project-average-rating",
      [Cl.uint(projectId)],
      address1
    );
    expect(avgRating.result).toBeErr(Cl.uint(101)); // err-not-found
  });

  it("should return correct project completion status", () => {
    const { projectId } = setupCompletedProject();

    // Check that project is marked as complete
    const isComplete = simnet.callReadOnlyFn(
      contractName,
      "is-project-complete",
      [Cl.uint(projectId)],
      address1
    );
    expect(isComplete.result).toBeBool(true);
  });
});
