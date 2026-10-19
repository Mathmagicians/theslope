# Markdown summary of a Cucumber JSON report (playwright-bdd cucumberReporter('json')). Arguments: title, note;
# counts, non-empty for the scenario counts as a JSON object (make developer-assemble).
# Features > elements (scenario | background) > steps; Before/After hooks are hidden steps; a keyword keeps its trailing space.
def steps: .steps[]? | select(.hidden != true);

def status:
  [steps | .result.status]
  | if any(. == "failed") then "failed" elif any(. == "undefined") then "undefined" elif all(. == "passed") then "passed" else "other" end;

[.[] | . as $f | .elements[]? | select(.type == "scenario")
  | {uri: $f.uri, feature: $f.name, name, line, status: status,
     step: (first(steps | select(.result.status == "failed" or .result.status == "undefined")) // null)}] as $scenarios
| {features: length,
   scenarios: ($scenarios | length),
   passed: ([$scenarios[] | select(.status == "passed")] | length),
   failed: ([$scenarios[] | select(.status == "failed")] | length),
   undefined: ([$scenarios[] | select(.status == "undefined")] | length),
   other: ([$scenarios[] | select(.status == "other")] | length)} as $r
| if ($ARGS.named.counts // "" | length) > 0 then $r else
  ($r.failed + $r.undefined > 0) as $red
  | (if $red then "❌" else "✅" end) as $icon
  | "## \($icon) \($title)\n\n| Features | Scenarios | Passed | Failed | Undefined |\n|---:|---:|---:|---:|---:|\n| \($r.features) | \($r.scenarios) | \($r.passed) | \($r.failed) | \($r.undefined) |\n"
    + (if $red then
        "\n**Failing scenarios**\n\n"
        + ([$scenarios[] | select(.status == "failed" or .status == "undefined")
            | "- `\(.uri):\(.line)` \(.feature) › \(.name) — \(.step.keyword)\(.step.name) (\(.step.result.status))"
              + ((.step.result.error_message // "" | split("\n")[0]) as $e | if ($e | length) > 0 then " — \($e)" else "" end)]
           | join("\n")) + "\n"
       else "" end)
    + (if $red and (($note | length) > 0) then "\n> ⚠️ \($note)\n" else "" end)
  end
