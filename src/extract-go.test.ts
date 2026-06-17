import { test } from "node:test";
import assert from "node:assert/strict";
import { extractGoFunctions, blankGoLiterals } from "./extract-go.js";
import { buildGraph } from "./graph.js";

const SERVER = `
package main

import "fmt"

type Server struct {
	store *Store
}

func NewServer(s *Store) *Server {
	return &Server{store: s}
}

func (s *Server) Handle(req Request) Response {
	data := s.store.Lookup(req.ID)
	return s.render(validate(data))
}

func (s *Server) render(d Data) Response {
	fmt.Println("rendering")
	return Response{}
}

func validate(d Data) Data {
	return d
}
`;

test("extracts Go funcs and methods with Receiver.Method ids", () => {
  const fns = extractGoFunctions("server.go", SERVER);
  assert.deepEqual(
    fns.map((f) => f.name).sort(),
    ["NewServer", "Server.Handle", "Server.render", "validate"],
  );
});

test("collects Go calls, attributing to the enclosing func, method names via selector", () => {
  const fns = extractGoFunctions("server.go", SERVER);
  const handle = fns.find((f) => f.name === "Server.Handle")!;
  assert.deepEqual([...new Set(handle.calls)].sort(), ["Lookup", "render", "validate"]);
});

test("pointer and value receivers normalize to the same type", () => {
  const fns = extractGoFunctions("a.go", `func (s *Server) A() {}\nfunc (s Server) B() {}`);
  assert.deepEqual(fns.map((f) => f.name).sort(), ["Server.A", "Server.B"]);
});

test("interface{} and struct{} in signatures don't fake the body brace", () => {
  const fns = extractGoFunctions(
    "a.go",
    `func F(x interface{}) struct{ Y int } {\n\treturn doThing(x)\n}`,
  );
  assert.equal(fns.length, 1);
  assert.equal(fns[0].name, "F");
  assert.deepEqual(fns[0].calls, ["doThing"]);
});

test("calls inside closures attribute to the enclosing named func", () => {
  const fns = extractGoFunctions(
    "a.go",
    `func Run() {\n\titems.ForEach(func(i Item) {\n\t\tprocess(i)\n\t})\n}`,
  );
  const run = fns.find((f) => f.name === "Run")!;
  assert.ok(run.calls.includes("process"));
});

test("raw strings and comments never produce calls or braces", () => {
  const fns = extractGoFunctions(
    "a.go",
    "func F() {\n\ts := `fake(1) { not a brace`  // real(2)\n\treturn real(s)\n}",
  );
  assert.equal(fns.length, 1);
  assert.deepEqual(fns[0].calls, ["real"]);
});

test("Go rename keeps renameHash stable", () => {
  const [a] = extractGoFunctions("a.go", `func calc(x int) int {\n\treturn helper(x)\n}`);
  const [b] = extractGoFunctions("a.go", `func compute(x int) int {\n\treturn helper(x)\n}`);
  assert.notEqual(a.bodyHash, b.bodyHash);
  assert.equal(a.renameHash, b.renameHash);
});

test("Go calls resolve to cross-file edges in the unified graph", () => {
  const g = buildGraph([
    { path: "api.go", text: `package main\nfunc Handle() {\n\tProcess()\n}` },
    { path: "svc.go", text: `package main\nfunc Process() {}` },
  ]);
  assert.ok(g.edges.has("api.go#Handle -> svc.go#Process"));
});

test("interface method signatures (no body) are skipped, not mis-parsed", () => {
  const fns = extractGoFunctions(
    "a.go",
    `type Reader interface {\n\tRead(p []byte) (int, error)\n}\nfunc real() {\n\tx()\n}`,
  );
  assert.deepEqual(fns.map((f) => f.name), ["real"]);
});

test("blanking preserves length and newlines", () => {
  const text = "func F() {\n\ts := `multi\nline`\n\t// c\n}\n";
  const clean = blankGoLiterals(text);
  assert.equal(clean.length, text.length);
  assert.equal(clean.split("\n").length, text.split("\n").length);
});
