"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOffline } from "next/offline";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from "ai";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowExpand01Icon,
  ArrowShrink01Icon,
  ArrowUp01Icon,
  Attachment01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CheckmarkSquare01Icon,
  Clock01Icon,
  DashboardSquare01Icon,
  Mic01Icon,
  PencilEdit01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import { describeAssistantError } from "@/lib/ai/errors";
import type { ModelInfo } from "@/lib/ai/models";
import { ModelPicker } from "./model-picker";
import { PendingTurn } from "./pending-turn";

type IconType = typeof Clock01Icon;

function IconButton({
  icon,
  label,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  icon: IconType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(
              "t-press grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground",
              "hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              className,
            )}
          >
            <HugeiconsIcon icon={icon} className="size-4" />
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Chip({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: IconType;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="t-press inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40"
    >
      <HugeiconsIcon icon={icon} className="size-3.5" />
      {children}
    </button>
  );
}

/** Our tools resolve to { created: false, error } rather than throwing. */
function toolErrorText(part: unknown): string | null {
  const output = (part as { output?: unknown }).output;
  if (output && typeof output === "object") {
    const message = (output as { error?: unknown }).error;
    if (typeof message === "string") return message;
  }
  return null;
}

function AssistantMessage({
  message,
  seconds,
  streaming,
  open,
  onOpenChange,
}: {
  message: UIMessage;
  seconds: number;
  streaming: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reasoning = message.parts
    .filter(isReasoningUIPart)
    .map((part) => part.text)
    .join("\n")
    .trim();

  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");

  const tools = message.parts.filter(isToolUIPart);
  const hasWork = Boolean(reasoning) || tools.length > 0;
  const label = streaming ? "Working…" : `Worked for ${seconds || 1}s`;

  return (
    <div className="flex flex-col gap-2">
      {hasWork ? (
        <Collapsible open={open} onOpenChange={onOpenChange}>
          <CollapsibleTrigger
            render={
              <button className="t-press group flex w-full items-center gap-1 border-b border-border pb-2 text-left text-xs text-muted-foreground hover:text-foreground">
                {streaming ? (
                  <span className="t-shimmer" data-text={label}>
                    {label}
                  </span>
                ) : (
                  <span>{label}</span>
                )}
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className="size-3.5 transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[panel-open]:rotate-180"
                />
              </button>
            }
          />
          <CollapsibleContent>
            <div className="flex flex-col gap-2 py-3">
              {reasoning ? (
                <>
                  <p className="text-xs font-medium">Thought process</p>
                  <p className="text-xs leading-5 whitespace-pre-wrap text-muted-foreground italic">
                    {reasoning}
                  </p>
                </>
              ) : null}

              {tools.map((part, index) => {
                const failure =
                  part.state === "output-error" ? "" : toolErrorText(part);
                const failed = part.state === "output-error" || failure !== null;
                const done = part.state === "output-available" && !failed;

                return (
                  <p
                    key={index}
                    className={cn(
                      "flex items-start gap-1.5 text-xs",
                      failed ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    <HugeiconsIcon
                      icon={done ? CheckmarkCircle02Icon : Clock01Icon}
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    <span>
                      {getToolName(part)}
                      {failed ? ` — ${failure || "could not complete"}` : null}
                      {!failed && !done ? "…" : null}
                    </span>
                  </p>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {text ? (
        <p className="text-sm leading-6 whitespace-pre-wrap">{text}</p>
      ) : null}
    </div>
  );
}

export function AssistantBar({
  models,
  defaultModelId,
}: {
  models: ModelInfo[];
  defaultModelId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isOffline = useOffline();

  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [tall, setTall] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [reasoningOpen, setReasoningOpen] = useState<Record<string, boolean>>(
    {},
  );
  const [queued, setQueued] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number | null>(null);

  const { value: modelId, setValue: setModelId } = useLocalStorage(
    "moly.assistant.model",
    defaultModelId ?? "",
  );

  const {
    messages,
    sendMessage,
    setMessages,
    regenerate,
    status,
    stop,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // A function, so the model and the page the user is on are read at send
      // time rather than frozen when the transport was constructed.
      body: () => ({ modelId, pathname }),
    }),
    // An error must never land inside a collapsed card.
    onError: () => setOpen(true),
  });

  const busy = status === "submitted" || status === "streaming";
  const noModel = !defaultModelId;
  const errorCopy = describeAssistantError(error, isOffline);
  const cardOpen = open && (messages.length > 0 || Boolean(errorCopy));

  const last = messages.at(-1);
  const lastAssistantId =
    last?.role === "assistant" ? last.id : undefined;
  const lastHasContent = Boolean(
    last?.role === "assistant" &&
      last.parts.some(
        (part) =>
          isTextUIPart(part) || isReasoningUIPart(part) || isToolUIPart(part),
      ),
  );

  // Live "Worked for Ns", then frozen against the message it belongs to.
  useEffect(() => {
    if (!busy) return;
    startedAt.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      if (startedAt.current) {
        setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [busy]);

  useEffect(() => {
    if (busy || startedAt.current === null) return;
    const seconds = Math.max(
      1,
      Math.round((Date.now() - startedAt.current) / 1000),
    );
    startedAt.current = null;
    const settled = messages.filter((m) => m.role === "assistant").at(-1);
    if (settled) {
      setDurations((current) => ({ ...current, [settled.id]: seconds }));
    }

    // The agent writes through a route handler, where cache invalidation is a
    // no-op — refresh so the panels behind the bar show what changed.
    router.refresh();
  }, [busy, messages, router]);

  // A follow-up typed mid-run goes out as soon as the run settles.
  useEffect(() => {
    if (busy || !queued) return;
    const text = queued;
    setQueued(null);
    sendMessage({ text });
  }, [busy, queued, sendMessage]);

  useEffect(() => {
    if (messages.length > 0) setOpen(true);
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value || noModel) return;

    setInput("");
    setOpen(true);
    if (busy) setQueued(value);
    else sendMessage({ text: value });
    inputRef.current?.focus();
  }

  function quickSend(text: string) {
    if (busy || noModel) return;
    setOpen(true);
    sendMessage({ text });
  }

  function newChat() {
    setMessages([]);
    setDurations({});
    setReasoningOpen({});
    setQueued(null);
    setOpen(false);
  }

  return (
    <TooltipProvider delay={300}>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {/* The ring lives on the outer element and paints at inset -2px, so
            this element must never get overflow-hidden — the inner one clips. */}
        <div className="rainbow-edge pointer-events-auto w-full max-w-2xl rounded-3xl shadow-lg">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div
              className="t-extend"
              style={{ gridTemplateRows: cardOpen ? "1fr" : "0fr" }}
            >
              <div className="min-h-0 overflow-hidden">
                <header className="flex items-center justify-between px-3 py-2">
                  <IconButton
                    icon={Clock01Icon}
                    label="Conversation history"
                    disabled
                  />
                  <div className="flex items-center gap-0.5">
                    <IconButton
                      icon={PencilEdit01Icon}
                      label="New chat"
                      onClick={newChat}
                    />
                    <IconButton
                      icon={tall ? ArrowShrink01Icon : ArrowExpand01Icon}
                      label={tall ? "Shrink panel" : "Expand panel"}
                      onClick={() => setTall((value) => !value)}
                    />
                    <IconButton
                      icon={Cancel01Icon}
                      label="Close"
                      onClick={() => setOpen(false)}
                    />
                  </div>
                </header>

                <div
                  ref={scrollRef}
                  className={cn(
                    "flex flex-col gap-4 overflow-y-auto px-4 pb-4",
                    "transition-[max-height] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    tall ? "max-h-[70vh]" : "max-h-[40vh]",
                  )}
                >
                  {messages.map((message) =>
                    message.role === "user" ? (
                      <div key={message.id} className="flex justify-end">
                        <p className="max-w-[85%] rounded-xl bg-accent px-3 py-1.5 text-sm">
                          {message.parts
                            .filter(isTextUIPart)
                            .map((part) => part.text)
                            .join("")}
                        </p>
                      </div>
                    ) : (
                      <AssistantMessage
                        key={message.id}
                        message={message}
                        seconds={durations[message.id] ?? elapsed}
                        streaming={busy && message.id === lastAssistantId}
                        // Opens itself while the model works, collapses when it
                        // finishes; a manual toggle outranks both.
                        open={
                          reasoningOpen[message.id] ??
                          (busy && message.id === lastAssistantId)
                        }
                        onOpenChange={(value) =>
                          setReasoningOpen((current) => ({
                            ...current,
                            [message.id]: value,
                          }))
                        }
                      />
                    ),
                  )}

                  {busy && !lastHasContent ? <PendingTurn /> : null}

                  {errorCopy ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-destructive/40 bg-destructive/5 p-3"
                    >
                      <p className="text-sm font-medium text-destructive">
                        {errorCopy.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {errorCopy.detail}
                      </p>
                      {errorCopy.retryable ? (
                        <button
                          onClick={() => regenerate()}
                          className="t-press mt-2 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                        >
                          Retry
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="p-2">
              <div className="flex items-center gap-0.5 overflow-x-auto px-1 pb-1.5">
                <IconButton
                  icon={Clock01Icon}
                  label="Conversation history"
                  disabled
                />
                <Chip
                  icon={CheckmarkSquare01Icon}
                  onClick={() => quickSend("Plan my day")}
                  disabled={busy || noModel}
                >
                  Plan my day
                </Chip>
                <Chip
                  icon={CheckmarkSquare01Icon}
                  onClick={() => quickSend("What's left today?")}
                  disabled={busy || noModel}
                >
                  What&apos;s left
                </Chip>
                <Chip
                  icon={DashboardSquare01Icon}
                  onClick={() => router.push("/tasks")}
                >
                  All tasks
                </Chip>

                <div className="ml-auto" />

                <Chip
                  icon={PlusSignIcon}
                  onClick={() => {
                    setInput("Add a task: ");
                    inputRef.current?.focus();
                  }}
                  disabled={noModel}
                >
                  New task
                </Chip>
              </div>

              <form
                onSubmit={submit}
                className="flex items-center gap-1 rounded-2xl border border-border bg-background px-3 py-1.5 ring-4 ring-ring/5 focus-within:border-ring/40"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  // Focusing is the way back into a collapsed conversation.
                  onFocus={() => {
                    if (messages.length > 0) setOpen(true);
                  }}
                  placeholder={
                    noModel
                      ? "Add a provider API key to start"
                      : busy
                        ? "Queue follow-up…"
                        : "Continue chat"
                  }
                  disabled={noModel}
                  aria-label="Message Moly"
                  className="min-w-0 flex-1 bg-transparent py-1 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
                />

                <ModelPicker
                  models={models}
                  value={modelId}
                  onChange={setModelId}
                />

                {/* Present because the reference has them; disabled because they
                    are not built. A dead-but-labelled control beats a fake one. */}
                <IconButton
                  icon={Attachment01Icon}
                  label="Attachments — not built yet"
                  disabled
                />

                {busy ? (
                  <IconButton
                    icon={Cancel01Icon}
                    label="Stop"
                    onClick={() => stop()}
                    className="bg-primary text-primary-foreground hover:bg-primary"
                  />
                ) : input.trim() ? (
                  <IconButton
                    icon={ArrowUp01Icon}
                    label="Send"
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary"
                  />
                ) : (
                  <IconButton
                    icon={Mic01Icon}
                    label="Voice input — not built yet"
                    disabled
                  />
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
