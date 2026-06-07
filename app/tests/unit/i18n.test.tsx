import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PordeeI18nProvider, usePordeeTranslation } from "~/lib/i18n/provider";

const InterpolationProbe = () => {
  const t = usePordeeTranslation();
  return <p>{t("common.itemCount", { count: 3 })}</p>;
};

describe("Pordee i18n", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
  });

  it("interpolates values in manual catalog messages", () => {
    render(
      <PordeeI18nProvider>
        <InterpolationProbe />
      </PordeeI18nProvider>
    );

    expect(screen.getByText("3 รายการ")).toBeInTheDocument();
  });
});
