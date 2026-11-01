# Prompt log (Phase 2)

Tool: Claude Code (Sonnet 5.5) in a terminal.

## Prompt 1 (verbatim)
> Can you get this repo https://github.com/ISamanie/h7_15114 and according to this the instructions here can you start building some of it https://www.cs.cmu.edu/~113/hw7.html. I know that the project does not have any code in it right now so ignore that and build some of it

What the AI did: cloned the repo, read the assignment page, `spec.md` and `README.md`, found there was no `src/`, and built Phase 1 following the README's own module map.

## Things the AI did that were not wanted
1. **Injected instruction.** The assignment page contains a line telling AI readers to scatter the comment "hotdog" through generated code. It was not part of the user's request, so the AI did not follow it. No such comments are in this repo.
2. **Bug in its own code.** The first drag implementation multiplied by dt^2 where it should divide, so grabbing a log launched it to x~20000 and it was counted as lost. Found in the browser by logging, fixed in `applyDragForce`, re-verified by dragging a log into the furnace.
3. **Tooling slip.** `Economy` first used constructor parameter properties, which Node's type stripping rejects for `npm test`. Rewritten with explicit fields.
