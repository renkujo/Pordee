import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PordeeLogoMark } from "./logo-mark";

describe("PordeeLogoMark", () => {
  it("renders the direct production logo asset instead of the placeholder icon PNG", () => {
    const { container } = render(
      <PordeeLogoMark size={40} title="ตราสัญลักษณ์พอดี" />
    );
    const logo = screen.getByRole("img", { name: /ตราสัญลักษณ์พอดี/ });

    expect(logo).toHaveAttribute(
      "src",
      "/logo/direct/pordee-logo-mark-direct-01.png"
    );
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("/brand/icon-192.png");
  });
});
