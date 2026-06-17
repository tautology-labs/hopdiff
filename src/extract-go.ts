import { fnHashes, type FnInfo } from "./extract.js";

/**
 * Go extractor — hand-rolled, zero dependencies. Go has no nested named
 * functions (only anonymous literals), so every named func/method is at file
 * scope, which makes extraction clean: blank strings/comments, find each
 * `func` declaration, brace-match its body, collect the calls inside.
 * Methods become `Receiver.Method` (pointer receivers normalized, `*T` -> T),
 * matching the Class.method convention the rest of the pipeline expects.
 * Calls inside closures attribute to the enclosing named function.
 */

const KEYWORDS = new Set([
  "if", "for", "switch", "select", "return", "go", "defer", "func", "case",
  "else", "range", "map", "chan", "struct", "interface", "type", "var",
  "const", "package", "import", "break", "continue", "fallthrough", "goto",
  "default", "make", "new", "panic", "recover", "len", "cap", "append",
  "copy", "close", "delete", "print", "println", "string", "int", "bool",
]);

/** Blank comments and string/rune literals (offset- and newline-preserving). */
export function blankGoLiterals(text: string): string {
  const out = text.split("");
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") out[i++] = " ";
    } else if (c === "/" && text[i + 1] === "*") {
      out[i++] = " "; out[i++] = " ";
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) {
        if (text[i] !== "\n") out[i] = " ";
        i++;
      }
      if (i < n) { out[i++] = " "; out[i++] = " "; }
    } else if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out[i++] = " ";
      while (i < n && text[i] !== q) {
        if (q !== "`" && text[i] === "\\") { out[i++] = " "; if (i < n) out[i++] = " "; continue; }
        if (text[i] !== "\n") out[i] = " ";
        i++;
      }
      if (i < n) out[i++] = " ";
    } else {
      i++;
    }
  }
  return out.join("");
}

function matchBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) return i; }
  }
  return text.length - 1;
}

/** From just after the func name, find the body's opening brace, stepping over
 *  the parameter/return section and any `interface{}` / `struct{...}` types. */
function findBodyStart(text: string, from: number): number {
  let depth = 0; // () and []
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "{" && depth === 0) {
      let j = i - 1;
      while (j >= 0 && /\s/.test(text[j])) j--;
      let k = j;
      while (k >= 0 && /[A-Za-z_]\w*/.test(text[k])) k--;
      const word = text.slice(k + 1, j + 1);
      if (word === "interface" || word === "struct") {
        i = matchBrace(text, i); // skip the type literal's braces
        continue;
      }
      return i;
    }
  }
  return -1;
}

const FUNC_RE = /\bfunc\s*(?:\(([^)]*)\)\s*)?([A-Za-z_]\w*)\s*\(/g;
const CALL_RE = /([A-Za-z_]\w*)\s*\(/g;

function receiverType(receiver: string): string | null {
  // "s *Server" | "Server" | "s Server" -> "Server"
  const m = /(?:\w+\s+)?\*?([A-Za-z_]\w*)\s*$/.exec(receiver.trim());
  return m ? m[1] : null;
}

export function extractGoFunctions(path: string, text: string): FnInfo[] {
  const clean = blankGoLiterals(text);
  const lineAt = (idx: number) => {
    let line = 1;
    for (let i = 0; i < idx && i < clean.length; i++) if (clean[i] === "\n") line++;
    return line;
  };
  const fns: FnInfo[] = [];

  FUNC_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FUNC_RE.exec(clean)) !== null) {
    const receiver = m[1];
    const bare = m[2];
    const recvType = receiver ? receiverType(receiver) : null;
    const name = recvType ? `${recvType}.${bare}` : bare;

    const afterName = m.index + m[0].length - 1; // at the '(' of the params
    const bodyStart = findBodyStart(clean, afterName);
    if (bodyStart === -1) continue; // forward decl / interface method signature
    const bodyEnd = matchBrace(clean, bodyStart);

    const source = text.slice(m.index, bodyEnd + 1);
    const calls: string[] = [];
    CALL_RE.lastIndex = 0;
    let cm: RegExpExecArray | null;
    const body = clean.slice(bodyStart, bodyEnd + 1);
    while ((cm = CALL_RE.exec(body)) !== null) {
      if (!KEYWORDS.has(cm[1])) calls.push(cm[1]);
    }

    fns.push({
      id: `${path}#${name}`,
      file: path,
      name,
      line: lineAt(m.index),
      source,
      ...fnHashes(source, name),
      calls,
      params: new Set(),
    });
  }

  return fns;
}
