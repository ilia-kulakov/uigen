import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// ── Pure function tests ────────────────────────────────────────────────────

describe("getToolCallLabel", () => {
  test("str_replace_editor create", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
  });

  test("str_replace_editor str_replace", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/src/Button.tsx" })).toBe("Editing Button.tsx");
  });

  test("str_replace_editor insert", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/src/main.tsx" })).toBe("Inserting into main.tsx");
  });

  test("str_replace_editor view", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/config.ts" })).toBe("Viewing config.ts");
  });

  test("str_replace_editor undo_edit", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/index.tsx" })).toBe("Undoing edit in index.tsx");
  });

  test("str_replace_editor unknown command with path falls back to Editing", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "unknown", path: "/foo.ts" })).toBe("Editing foo.ts");
  });

  test("str_replace_editor no command and no path falls back to tool name", () => {
    expect(getToolCallLabel("str_replace_editor", {})).toBe("str_replace_editor");
  });

  test("file_manager rename", () => {
    expect(
      getToolCallLabel("file_manager", { command: "rename", path: "/Old.tsx", new_path: "/New.tsx" })
    ).toBe("Renaming Old.tsx → New.tsx");
  });

  test("file_manager delete", () => {
    expect(getToolCallLabel("file_manager", { command: "delete", path: "/utils.ts" })).toBe("Deleting utils.ts");
  });

  test("file_manager unknown command with path falls back to file operation", () => {
    expect(getToolCallLabel("file_manager", { command: "unknown", path: "/foo.ts" })).toBe("File operation on foo.ts");
  });

  test("unknown tool falls back to tool name", () => {
    expect(getToolCallLabel("some_other_tool", { command: "do_thing" })).toBe("some_other_tool");
  });

  test("uses only filename from nested path", () => {
    expect(
      getToolCallLabel("str_replace_editor", { command: "create", path: "/src/components/Button.tsx" })
    ).toBe("Creating Button.tsx");
  });
});

// ── Component rendering tests ──────────────────────────────────────────────

describe("ToolCallBadge component", () => {
  test("shows green dot and label when state is result with a result value", () => {
    const { container } = render(
      <ToolCallBadge
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/App.jsx" },
          state: "result",
          result: "Success",
        }}
      />
    );

    expect(screen.getByText("Creating App.jsx")).toBeDefined();
    // Green dot div is present
    const dot = container.querySelector(".bg-emerald-500");
    expect(dot).toBeDefined();
    // Spinner is not present
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeNull();
  });

  test("shows spinner and label when state is call (pending)", () => {
    const { container } = render(
      <ToolCallBadge
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "str_replace", path: "/Button.tsx" },
          state: "call",
        }}
      />
    );

    expect(screen.getByText("Editing Button.tsx")).toBeDefined();
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
    const dot = container.querySelector(".bg-emerald-500");
    expect(dot).toBeNull();
  });

  test("shows spinner when result is null even if state is result", () => {
    const { container } = render(
      <ToolCallBadge
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/App.jsx" },
          state: "result",
          result: null,
        }}
      />
    );

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
    const dot = container.querySelector(".bg-emerald-500");
    expect(dot).toBeNull();
  });

  test("renders file_manager rename label", () => {
    render(
      <ToolCallBadge
        toolInvocation={{
          toolName: "file_manager",
          args: { command: "rename", path: "/Old.tsx", new_path: "/New.tsx" },
          state: "result",
          result: { success: true },
        }}
      />
    );

    expect(screen.getByText("Renaming Old.tsx → New.tsx")).toBeDefined();
  });

  test("renders file_manager delete label", () => {
    render(
      <ToolCallBadge
        toolInvocation={{
          toolName: "file_manager",
          args: { command: "delete", path: "/utils.ts" },
          state: "result",
          result: { success: true },
        }}
      />
    );

    expect(screen.getByText("Deleting utils.ts")).toBeDefined();
  });

  test("falls back to raw tool name for unknown tools", () => {
    render(
      <ToolCallBadge
        toolInvocation={{
          toolName: "unknown_tool",
          args: {},
          state: "result",
          result: "done",
        }}
      />
    );

    expect(screen.getByText("unknown_tool")).toBeDefined();
  });
});
