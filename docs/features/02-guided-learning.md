# Feature spec 02: Guided learning

**Priority:** P1

**Outcome:** Explanations adapt consistently during a reading session and offer grounded next steps without turning the product into generic chat.

## User stories

- As a learner, I can choose concise, standard, or foundational depth and retain that preference during the browser session.
- After an explanation, I see two useful follow-up actions derived from the same bounded proof context.
- I can open a prerequisite or glossary explanation without losing the original selection.

## Scope

- Add a session-scoped explanation-depth preference: `concise`, `standard`, or `foundational`.
- Map existing actions onto depth without removing their explicit intent: **Simpler** requests foundational depth; other actions use the saved preference.
- Return exactly two structured follow-up suggestions with a completed explanation.
- Add glossary/prerequisite chips sourced from package metadata.
- Keep suggestions and chips independently rendered from validated structured data.

## Non-goals

- User profiles or cross-device preferences.
- Unbounded model-authored suggested prompts.
- Saving conversations after the tab/session ends.
- Replacing the five selection actions.

## Data contract

```ts
type ExplanationDepth = "concise" | "standard" | "foundational";

type FollowUpSuggestion = {
  id: string;
  label: string;
  question: string;
  sourceIds: string[];
};
```

Add `depth` to the validated explanation request. Suggestions must cite only `allowedSourceIds`, have bounded label/question lengths, and be returned in a structured terminal SSE event. If the model response lacks valid suggestions, the server supplies deterministic package-derived fallbacks or returns none.

## State behavior

- Store depth in `sessionStorage`; default to `standard`.
- Apply the stored value after hydration without causing a server/client mismatch.
- A suggestion click submits a normal bounded follow-up and remains editable before sending if the user chooses “Ask in side chat.”
- A failed suggestion preserves the explanation and suggestion list.
- Opening a glossary/prerequisite chip does not trigger a model call.

## UX requirements

- Depth control is visible but secondary inside the explanation panel.
- Selected depth has text and programmatic state, not color alone.
- Suggested questions appear after the answer under “Keep exploring.”
- Curated glossary/prerequisite content is labeled as such, never “AI explanation.”
- Mobile controls meet touch targets; keyboard order follows answer, sources, suggestions, form.

## Acceptance criteria

- Depth persists across proof navigation in one tab and resets in a new session.
- **Simpler** always requests foundational depth without permanently changing preference unless the learner explicitly changes it.
- Two valid suggestions appear for mapped representative cases.
- No suggestion contains an unknown source ID or exceeds request budgets.
- Suggestion use retains the original selection and bounded history.
- Keyboard, focus restoration, 360 px, 200% zoom, and reduced motion remain correct.

## Test plan

- Request schema tests for depth and suggestion limits.
- Context/instruction tests demonstrating depth differences.
- SSE parser tests for structured terminal metadata.
- Browser tests for persistence, suggestion submission, editability, failure preservation, mobile, and keyboard.
- Evaluation cases for concise versus foundational explanations.

## Dependencies and conflicts

Coordinate URL/state ownership with the deep-link feature. Session preference must not overwrite an explicit deep-link depth parameter; explicit URL state wins for that navigation only.
