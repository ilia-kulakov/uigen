import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, unknown>;
    state: string;
    result?: unknown;
  };
}

export function getToolCallLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  const filename = (path: unknown) =>
    typeof path === "string" ? path.split("/").pop() ?? path : "";

  if (toolName === "str_replace_editor") {
    const command = args.command as string | undefined;
    const name = filename(args.path);
    switch (command) {
      case "create":
        return `Creating ${name}`;
      case "str_replace":
        return `Editing ${name}`;
      case "insert":
        return `Inserting into ${name}`;
      case "view":
        return `Viewing ${name}`;
      case "undo_edit":
        return `Undoing edit in ${name}`;
      default:
        return name ? `Editing ${name}` : toolName;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string | undefined;
    const name = filename(args.path);
    const newName = filename(args.new_path);
    switch (command) {
      case "rename":
        return `Renaming ${name} → ${newName}`;
      case "delete":
        return `Deleting ${name}`;
      default:
        return name ? `File operation on ${name}` : toolName;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const isComplete =
    toolInvocation.state === "result" && toolInvocation.result != null;
  const label = getToolCallLabel(toolInvocation.toolName, toolInvocation.args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
