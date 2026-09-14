import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Folder } from "./Folder";

describe("Folder interaction", () => {
  afterEach(cleanup);
  it.each(["Enter", " "]) ("opens with %s", (key) => {
    render(<Folder cards={[{ id: 1, title: "第一条" }]} />);
    const trigger = screen.getByRole("button", { name: "蓝色文件夹，1 张笔记卡片" });
    fireEvent.keyDown(trigger, { key });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("calls the card callback without toggling the folder", () => {
    const onCardClick = vi.fn();
    render(<Folder cards={[{ id: 1, title: "第一条" }]} onCardClick={onCardClick} />);
    const trigger = screen.getByRole("button", { name: "蓝色文件夹，1 张笔记卡片" });
    fireEvent.click(screen.getByRole("button", { name: "第一条" }));
    expect(onCardClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not render a focusable card button when data is absent", () => {
    render(<Folder />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
