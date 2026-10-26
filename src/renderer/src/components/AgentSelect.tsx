import type { Agent } from "../../../core/agents";
import { PreviewSelect } from "./PreviewSelect";

export function AgentSelect({
  value,
  onChange,
  disabled,
}: {
  value: Agent;
  onChange: (agent: Agent) => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-44 min-w-0 text-[13px]">
      <PreviewSelect
        label="Agent"
        value={value}
        disabled={disabled}
        options={[
          { id: "claude", label: "Claude Code" },
          { id: "codex", label: "Codex" },
        ]}
        onChange={onChange}
      />
    </div>
  );
}
