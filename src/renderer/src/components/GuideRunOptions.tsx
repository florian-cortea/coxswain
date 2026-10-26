import { AgentSelect } from "./AgentSelect";
import { useQuery } from "@tanstack/react-query";
import type { GuideOverride, GuideSettings } from "../../../core/guides";
import { core } from "../queries";
import { Button } from "./button";
import { ChevronDownIcon, SpinnerIcon } from "./icons";
import { cn, muted } from "./styles";
import { ErrorText } from "./text";

// Shared native pickers. Model-specific discovery never changes the chat's selected model/effort.
export function GuideRunOptions(props: {
  workspaceId?: number;
  settings: GuideSettings;
  value: GuideOverride;
  override?: boolean;
  disabled?: boolean;
  onChange: (value: GuideOverride) => void;
}) {
  const agent = props.value.agent ?? props.settings.agent;
  const defaults = useQuery({
    ...core("getGuideSettings", agent),
    enabled: agent !== props.settings.agent,
  });
  const settings = agent === props.settings.agent ? props.settings : defaults.data;
  const model = props.value.model ?? settings?.model ?? "";
  const catalog = useQuery({
    ...core("listAgentPicks", props.workspaceId ?? 0, agent),
    enabled: props.workspaceId !== undefined && !!settings,
    staleTime: 5 * 60_000,
  });
  const picks = useQuery({
    ...core("listAgentPicks", props.workspaceId ?? 0, agent, model),
    enabled: props.workspaceId !== undefined && !!settings,
    staleTime: 5 * 60_000,
  });
  const modelChoices = picks.data?.model ?? catalog.data?.model;
  const modelName = (value: string) =>
    modelChoices?.choices.find((choice) => choice.value === value)?.name ??
    (value || "Agent default");
  const effortName = (value: string) =>
    picks.data?.effort?.choices.find((choice) => choice.value === value)?.name ??
    (value || "Agent default");
  const options = (pick: "model" | "effort") => [
    ...(props.override
      ? [
          {
            value: undefined,
            name: `App default · ${pick === "model" ? modelName(settings?.model ?? "") : effortName(settings?.effort ?? "")}`,
          },
        ]
      : []),
    { value: "", name: "Agent default" },
    ...((pick === "model" ? modelChoices : picks.data?.effort)?.choices.filter(
      (choice) => choice.value !== "default",
    ) ?? []),
  ];
  return (
    <div className="flex flex-col gap-3">
      {props.override && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-24 shrink-0 text-[13px] font-medium">Agent</span>
          <AgentSelect
            value={agent}
            disabled={props.disabled}
            onChange={(agent) => props.onChange({ agent, model: undefined, effort: undefined })}
          />
          {props.value.agent !== undefined && (
            <Button
              variant="link"
              className={cn("text-xs", muted)}
              disabled={props.disabled}
              onClick={() =>
                props.onChange({ agent: undefined, model: undefined, effort: undefined })
              }
            >
              Use app default
            </Button>
          )}
        </div>
      )}
      {(["model", "effort"] as const).map((pick) => {
        const choices = options(pick);
        const selected = props.value[pick];
        const label =
          choices.find((choice) => choice.value === selected)?.name ?? selected ?? "App default";
        const unavailable =
          pick === "effort" && picks.isSuccess && !picks.data.effort?.choices.length;
        const loading =
          pick === "model"
            ? !settings || (catalog.isFetching && !modelChoices)
            : !settings || (picks.isFetching && !picks.data);
        return (
          <div key={pick} className="flex flex-wrap items-center gap-3">
            <span className="w-24 shrink-0 text-[13px] font-medium">
              {pick === "model" ? "Model" : "Effort"}
            </span>
            <Button
              className="min-w-0 gap-2"
              aria-label={pick === "model" ? "Guide model" : "Guide effort"}
              aria-busy={loading}
              disabled={
                props.disabled ||
                !settings ||
                props.workspaceId === undefined ||
                (pick === "effort" && (!picks.data || unavailable))
              }
              title={unavailable ? "This model doesn’t offer configurable effort" : undefined}
              onClick={async () => {
                const index = await window.coxswain.showPickMenu(
                  choices.map((choice) => choice.name),
                  choices.findIndex((choice) => choice.value === selected),
                );
                const choice = choices[index];
                if (!choice) return;
                props.onChange(
                  pick === "model"
                    ? { model: choice.value, effort: choice.value === undefined ? undefined : "" }
                    : { effort: choice.value },
                );
              }}
            >
              <span className="truncate">{label}</span>
              <span
                className="inline-flex size-3.5 shrink-0 items-center justify-center"
                role={loading ? "status" : undefined}
                aria-label={loading ? `Loading ${pick} options` : undefined}
              >
                {loading ? <SpinnerIcon /> : <ChevronDownIcon />}
              </span>
            </Button>
            {unavailable && !picks.isFetching && !picks.isError && (
              <span className={cn("text-xs", muted)}>Not offered by this model</span>
            )}
          </div>
        );
      })}
      {picks.isError && <ErrorText>Couldn’t load model options from the agent.</ErrorText>}
      {agent !== props.settings.agent && defaults.isError && (
        <ErrorText>Couldn’t load this agent’s Guide defaults.</ErrorText>
      )}
    </div>
  );
}
