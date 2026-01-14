import { describe, it, expect } from "vitest";

describe("Smoke Test", () => {
  it("should pass a basic truthy assertion", () => {
    expect(true).toBe(true);
  });

  it("should be able to perform basic math", () => {
    expect(1 + 1).toBe(2);
  });
});
