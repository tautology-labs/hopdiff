import { spawnSync } from "node:child_process";
import { diffGraphs, type Graph, type GraphDiff } from "./graph.js";
import {
  changedEntries,
  groupEdges,
  renderFnBlock,
  type ChangeEntry,
} from "./render.js";
import { diffLines } from "./linediff.js";
import { bold, cyan, dim, green, red, yellow } from "./ansi.js";

export interface TuiOptions {
  cwd: string;
  baseLabel: string;
  headLabel: string;
  baseGraph: Graph;
  initialHead: Graph;
  loadHead: () => Graph;
  headIsWorktree: boolean;
}

const HELP_LINES = [
  "",
  bold("  keys"),
  "",
  `  ${cyan("↑/↓ j/k")}   move between functions`,
  `  ${cyan("enter")}     expand/collapse the function's diff (or jump, if a target is picked)`,
  `  ${cyan("tab")}       pick a caller/callee to jump to (shown in the footer)`,
  `  ${cyan("e")}         open $EDITOR at this function, refresh on return`,
  `  ${cyan("r")}         re-scan the working tree`,
  `  ${cyan("?")}         toggle this help`,
  `  ${cyan("q")}         quit`,
  "",
  bold("  markers"),
  "",
  `  ${green("+ added")}   ${red("− removed")}   ${yellow("~ body changed")}   ${cyan("→ renamed/moved")}`,
  `  ${dim("callers = arrows in · calls = arrows out (in repo) · external = calls leaving the repo")}`,
];

export function runTui(opts: TuiOptions): void {
  let headGraph = opts.initialHead;
  let diff: GraphDiff = diffGraphs(opts.baseGraph, headGraph);
  let entries: ChangeEntry[] = changedEntries(diff);
  let selected = 0;
  let scroll = 0;
  let jumpIdx = -1;
  let showHelp = false;
  let status = "";
  const expanded = new Set<string>();

  const out = process.stdout;

  const currentGraph = (e: ChangeEntry): Graph =>
    e.after ? headGraph : opts.baseGraph;

  /** In-repo callers and callees of this card that have cards of their own. */
  const jumpTargets = (e: ChangeEntry): { id: string; name: string }[] => {
    const g = currentGraph(e);
    const ids: string[] = [];
    for (const edge of g.callersOf.get(e.fn.id) ?? []) ids.push(edge.fromId);
    for (const edge of g.edges.values()) {
      if (edge.fromId === e.fn.id && !edge.external) ids.push(edge.toId);
    }
    const cards = new Set(entries.map((en) => en.fn.id));
    return [...new Set(ids)]
      .filter((id) => cards.has(id) && id !== e.fn.id)
      .map((id) => ({ id, name: id.split("#")[1] ?? id }));
  };

  const expandedDiff = (e: ChangeEntry): string[] => {
    if (e.before && e.after) {
      return diffLines(e.before.source.split("\n"), e.after.source.split("\n")).map(
        (l) =>
          l.type === "+"
            ? green(`      + ${l.text}`)
            : l.type === "-"
              ? red(`      − ${l.text}`)
              : dim(`        ${l.text}`),
      );
    }
    const fn = (e.after ?? e.before)!;
    return fn.source
      .split("\n")
      .map((t) => (e.after ? green(`      + ${t}`) : red(`      − ${t}`)));
  };

  const buildLines = (): { lines: string[]; headerAt: number[] } => {
    const lines: string[] = [];
    const headerAt: number[] = [];
    lines.push(
      `${bold("flowdiff")} ${opts.baseLabel} ${dim("→")} ${opts.headLabel}   ` +
        `${green(`+${diff.added.length}`)} ${red(`−${diff.removed.length}`)} ${yellow(`~${diff.modified.length}`)} ${cyan(`→${diff.renamed.length}`)}   ` +
        `${dim("? for help")}`,
    );
    lines.push("");
    if (showHelp) {
      lines.push(...HELP_LINES);
      return { lines, headerAt };
    }
    if (entries.length === 0) {
      lines.push(dim("  no structural changes — edit something and press r"));
      return { lines, headerAt };
    }
    const ch = groupEdges(diff);
    let lastFile = "";
    entries.forEach((e, i) => {
      if (e.fn.file !== lastFile) {
        lines.push(bold(e.fn.file));
        lines.push("");
        lastFile = e.fn.file;
      }
      headerAt[i] = lines.length;
      const block: string[] = [];
      renderFnBlock(block, e.fn, e.marker, opts.baseGraph, headGraph, ch, new Set(), e.title);
      block[0] = (i === selected ? cyan("▸ ") : "  ") + block[0].slice(2);
      if (expanded.has(e.fn.id)) {
        block.splice(block.length - 1, 0, ...expandedDiff(e));
      }
      lines.push(...block);
    });
    return { lines, headerAt };
  };

  const render = (): void => {
    const rows = out.rows || 40;
    const { lines, headerAt } = buildLines();
    const view = rows - 1;
    const target = headerAt[selected] ?? 0;
    if (target < scroll) scroll = Math.max(0, target - 2);
    if (target >= scroll + view - 4) scroll = target - view + 5;
    scroll = Math.max(0, Math.min(scroll, Math.max(0, lines.length - view)));

    const e = entries[selected];
    const targets = e ? jumpTargets(e) : [];
    const jump =
      jumpIdx >= 0 && targets[jumpIdx]
        ? `${cyan("jump → " + targets[jumpIdx].name)} ${dim("(enter)")}  `
        : "";
    const footer =
      jump +
      status +
      dim("↑↓ move · enter expand · tab jump · e edit · r refresh · ? help · q quit");

    out.write(
      "\x1b[H\x1b[2J" +
        lines.slice(scroll, scroll + view).join("\r\n") +
        `\x1b[${rows};1H\x1b[2K` +
        footer,
    );
  };

  const refresh = (): void => {
    const keep = entries[selected]?.fn.id;
    headGraph = opts.loadHead();
    diff = diffGraphs(opts.baseGraph, headGraph);
    entries = changedEntries(diff);
    const idx = entries.findIndex((e) => e.fn.id === keep);
    selected = idx >= 0 ? idx : Math.min(selected, Math.max(0, entries.length - 1));
    jumpIdx = -1;
    status = "";
  };

  const openEditor = (e: ChangeEntry): void => {
    const fn = e.after ?? e.fn;
    const editor = process.env.EDITOR || process.env.VISUAL || "vi";
    const arg = editor.includes("code")
      ? `-g "${fn.file}:${fn.line}" --wait`
      : `+${fn.line} "${fn.file}"`;
    out.write("\x1b[?25h\x1b[?1049l");
    process.stdin.setRawMode(false);
    spawnSync(`${editor} ${arg}`, { shell: true, stdio: "inherit", cwd: opts.cwd });
    process.stdin.setRawMode(true);
    out.write("\x1b[?1049h\x1b[?25l");
    if (opts.headIsWorktree) {
      refresh();
      status = dim("rescanned · ");
    }
  };

  const quit = (): void => {
    out.write("\x1b[?25h\x1b[?1049l");
    process.stdin.setRawMode(false);
    process.exit(0);
  };

  out.write("\x1b[?1049h\x1b[?25l");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  out.on("resize", render);

  process.stdin.on("data", (key: string) => {
    const e = entries[selected];
    if (key === "q" || key === "\x03") quit();
    else if (key === "\x1b[A" || key === "k") {
      selected = Math.max(0, selected - 1);
      jumpIdx = -1;
    } else if (key === "\x1b[B" || key === "j") {
      selected = Math.min(entries.length - 1, selected + 1);
      jumpIdx = -1;
    } else if (key === "\t" && e) {
      const targets = jumpTargets(e);
      jumpIdx = targets.length > 0 ? (jumpIdx + 1) % targets.length : -1;
    } else if (key === "\r" && e) {
      const targets = jumpTargets(e);
      if (jumpIdx >= 0 && targets[jumpIdx]) {
        const idx = entries.findIndex((en) => en.fn.id === targets[jumpIdx].id);
        if (idx >= 0) selected = idx;
        jumpIdx = -1;
      } else if (expanded.has(e.fn.id)) expanded.delete(e.fn.id);
      else expanded.add(e.fn.id);
    } else if (key === " " && e) {
      if (expanded.has(e.fn.id)) expanded.delete(e.fn.id);
      else expanded.add(e.fn.id);
    } else if (key === "e" && e) openEditor(e);
    else if (key === "r") refresh();
    else if (key === "?") showHelp = !showHelp;
    render();
  });

  render();
}
