import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ResearchBackend } from "./backends/types.ts";

/** Session entry type used to persist mode state. */
const ENTRY_TYPE = "research-mode";

/** Custom message type carrying the mode instructions into the conversation. */
export const CONTEXT_MESSAGE_TYPE = "research-mode-context";

/** Marker used to detect stale mode context in the transcript. */
const CONTEXT_MARKER = "[RESEARCH MODE ACTIVE]";

/** Built-in tools that mutate the workspace; removed from the active set. */
const MUTATING_BUILTINS = new Set(["edit", "write"]);

interface ResearchModeState {
	active: boolean;
	toolsBefore?: string[];
}

/** Narrow shape used when scanning messages for stale mode context. */
interface ScannableMessage {
	role?: string;
	customType?: string;
	content?: unknown;
}

function unique(names: readonly string[]): string[] {
	return [...new Set(names)];
}

function isResearchContext(message: unknown): boolean {
	if (message === null || typeof message !== "object") return false;
	const candidate = message as ScannableMessage;

	if (candidate.customType === CONTEXT_MESSAGE_TYPE) return true;
	if (candidate.role !== "user") return false;

	const content = candidate.content;
	if (typeof content === "string") return content.includes(CONTEXT_MARKER);
	if (Array.isArray(content)) {
		return content.some(
			(part) =>
				part !== null &&
				typeof part === "object" &&
				"text" in part &&
				typeof (part as { text?: unknown }).text === "string" &&
				(part as { text: string }).text.includes(CONTEXT_MARKER),
		);
	}
	return false;
}

/**
 * The research-mode state machine: toggling, toolset swapping, context
 * injection, and branch-scoped persistence. Knows nothing about any specific
 * backend beyond the `ResearchBackend` interface.
 */
export class ResearchMode {
	private active = false;
	private toolsBefore: string[] | undefined;

	constructor(
		private readonly pi: ExtensionAPI,
		private readonly backends: readonly ResearchBackend[],
	) {}

	get isActive(): boolean {
		return this.active;
	}

	toggle(ctx: ExtensionContext): void {
		if (this.active) this.disable(ctx);
		else this.enable(ctx);
	}

	enable(ctx?: ExtensionContext): void {
		if (this.active) return;
		if (this.toolsBefore === undefined) {
			this.toolsBefore = this.pi.getActiveTools();
		}
		this.active = true;
		this.applyToolset();
		this.notify(ctx, `Research mode enabled (read-only). ${this.backendNames()} available.`, "info");
		this.updateStatus(ctx);
		this.persist();
	}

	disable(ctx?: ExtensionContext): void {
		if (!this.active) return;
		this.active = false;
		this.restoreToolset();
		this.notify(ctx, "Research mode disabled. Full access restored.", "info");
		this.updateStatus(ctx);
		this.persist();
	}

	/** Re-apply the toolset, e.g. after an MCP server connects and its tools appear. */
	refreshTools(): void {
		if (this.active) this.applyToolset();
	}

	/** The `before_agent_start` message for the current mode, if any. */
	contextMessage(): { customType: string; content: string; display: boolean } | undefined {
		if (!this.active) return undefined;
		return {
			customType: CONTEXT_MESSAGE_TYPE,
			content: this.contextText(),
			display: false,
		};
	}

	/**
	 * Drop stale research-mode context from the conversation when the mode is
	 * off. Returns `undefined` when nothing needs filtering.
	 */
	filterContext<T>(messages: readonly T[]): T[] | undefined {
		if (this.active) return undefined;
		return messages.filter((message) => !isResearchContext(message));
	}

	/** Restore mode state from the current session branch and re-apply the toolset. */
	restore(ctx: ExtensionContext): void {
		const entries = ctx.sessionManager.getBranch();
		let saved: ResearchModeState | undefined;
		for (const entry of entries) {
			if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
				saved = entry.data as ResearchModeState | undefined;
			}
		}

		if (saved) {
			this.active = saved.active ?? false;
			this.toolsBefore = saved.toolsBefore;
		}

		// `--research` forces the mode on for this session.
		if (this.pi.getFlag("research") === true) {
			this.active = true;
		}

		if (this.active) {
			if (this.toolsBefore === undefined) {
				this.toolsBefore = this.pi.getActiveTools();
			}
			this.applyToolset();
		} else {
			this.toolsBefore = undefined;
		}

		this.updateStatus(ctx);
	}

	private applyToolset(): void {
		const base = this.toolsBefore ?? this.pi.getActiveTools();
		this.pi.setActiveTools(
			unique([
				...base.filter((name) => !MUTATING_BUILTINS.has(name)),
				...this.toolsForBackends(),
			]),
		);
	}

	private restoreToolset(): void {
		if (this.toolsBefore !== undefined) {
			this.pi.setActiveTools(this.toolsBefore);
			this.toolsBefore = undefined;
		}
	}

	private toolsForBackends(): string[] {
		const allToolNames = this.pi.getAllTools().map((tool) => tool.name);
		return unique(this.backends.flatMap((backend) => backend.tools(allToolNames)));
	}

	private backendNames(): string {
		const names = this.backends.map((backend) => backend.name);
		return names.length === 0 ? "no research backends" : names.join(", ");
	}

	private contextText(): string {
		const backendSections = this.backends
			.map((backend) => backend.instructions.trim())
			.filter((section) => section.length > 0);

		return [
			CONTEXT_MARKER,
			"You are in research mode - a read-only mode for safe investigation.",
			"",
			"Restrictions:",
			"- Built-in edit and write tools are disabled",
			"- Bash is restricted to an allowlist of read-only commands",
			"- Tools marked destructive by their provider are blocked",
			"- Other currently active tools remain available",
			...(backendSections.length > 0 ? ["", "Research tooling:", ...backendSections] : []),
			"",
			"Do NOT attempt to modify the machine or workspace - investigate, read, and report only.",
		].join("\n");
	}

	private persist(): void {
		this.pi.appendEntry<ResearchModeState>(ENTRY_TYPE, {
			active: this.active,
			toolsBefore: this.toolsBefore,
		});
	}

	private updateStatus(ctx?: ExtensionContext): void {
		if (!ctx) return;
		ctx.ui.setStatus(
			"research-mode",
			this.active ? ctx.ui.theme.fg("warning", "🔎 research") : undefined,
		);
	}

	private notify(
		ctx: ExtensionContext | undefined,
		message: string,
		type: "info" | "warning" | "error",
	): void {
		if (!ctx?.hasUI) return;
		ctx.ui.notify(message, type);
	}
}
