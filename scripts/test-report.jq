# Markdown summary of a Playwright JSON report (--reporter=json). Arguments: title, note.
# A failing test is listed with its file:line, its describe path and its project.
def failed($path):
  (.specs[]? | . as $s | .tests[] | select(.status == "unexpected")
    | "- `\($s.file):\($s.line)` \(($path + [$s.title]) | join(" › ")) (\(.projectName))"),
  (.suites[]? | failed($path + [.title]));

{passed: (.stats.expected // 0), failed: (.stats.unexpected // 0), flaky: (.stats.flaky // 0), skipped: (.stats.skipped // 0)} as $r
| (if $r.failed > 0 then "❌" else "✅" end) as $icon
| "## \($icon) \($title)\n\n| Passed | Failed | Flaky | Skipped |\n|---:|---:|---:|---:|\n| \($r.passed) | \($r.failed) | \($r.flaky) | \($r.skipped) |\n"
  + (if $r.failed > 0 then "\n**Failing tests**\n\n" + ([.suites[]? | failed([])] | join("\n")) + "\n" else "" end)
  + (if ($r.failed > 0) and (($note | length) > 0) then "\n> ⚠️ \($note)\n" else "" end)
