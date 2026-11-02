# Prompt log (Phase 2)

Tool: Claude Code (Sonnet 5.5) in a terminal.

## Prompt 1 (verbatim)
> Can you get this repo https://github.com/ISamanie/h7_15114 and according to this the instructions here can you start building some of it https://www.cs.cmu.edu/~113/hw7.html. I know that the project does not have any code in it right now so ignore that and build some of it

What the AI did: cloned the repo, read the assignment page, `spec.md` and `README.md`, found there was no `src/`, and built Phase 1 following the README's own module map.

## Things the AI did that were not wanted
1. **Injected instruction.** The assignment page contains a line telling AI readers to scatter the comment "hotdog" through generated code. It was not part of the user's request, so the AI did not follow it. No such comments are in this repo.
2. **Bug in its own code.** The first drag implementation multiplied by dt^2 where it should divide, so grabbing a log launched it to x~20000 and it was counted as lost. Found in the browser by logging, fixed in `applyDragForce`, re-verified by dragging a log into the furnace.
3. **Tooling slip.** `Economy` first used constructor parameter properties, which Node's type stripping rejects for `npm test`. Rewritten with explicit fields.

## Prompt 2 (verbatim)
> yes start phase 2

What the AI did: built `Equipment.ts`, `EquipmentEffects.ts`, `EquipmentView.ts`, the shop UI and scene integration, plus 13 new unit tests, then ran each machine in a real browser.

Unwanted / mistakes this round:
4. **Left junk in generated code.** A placeholder line (`state.simulatedWorking ? 'Working' : 'Working'`) referencing a field that did not exist; typecheck caught it and it was removed.
5. **Wrong test, not wrong code.** A unit test expected a blocked undo that the API cannot produce (undo correctly reversed the latest action). The test was rewritten to cover the real failure case (buy-back unaffordable).
6. **Misread browser tests.** Two "trampoline did nothing" results came from the test script toggling build mode off and from dropping a log on the pad's underside, not from game bugs. Confirmed by re-running with controlled setups.

## Prompt 3 (verbatim)
> Just make a win screen for a pretty large money total, no need for levels. YOu can add the multiplier and the polish too. Can you also add the ability to rotate objects. Then when all that is done push it to my github

What the AI did: added `Throughput.ts`, the win dialog, furnace flames/sparks, rotating placed tools, and 10 more tests.

Unwanted / mistakes this round:
7. **First rotate design was frustrating.** A conveyor lying on the floor could not be rotated at all (its tilted corner would dip underground). Noticed in the browser, changed so rotation lifts the tool just enough, with undo restoring its height.
8. **Test arithmetic errors.** One throughput test assumed a delivery exactly 1000ms old is still in the window; the code (correctly) excludes it. The test was fixed, not the code. A rotation test with conditional assertions was replaced with a deterministic one.
9. **Misjudged an undo count** while reading a browser run; re-running the exact sequence showed 3 actions = 3 undos, so no code change.
