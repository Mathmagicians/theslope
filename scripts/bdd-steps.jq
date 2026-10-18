# Step reuse across Cucumber JSON reports, slurped (jq -s): one line "Steps: …", then the ten most used definitions,
# the definitions used once and the undefined steps. Argument summary: non-empty for the one line alone.
# A definition is a step's match.location; a pipe in a step text is escaped so the Markdown table keeps its columns.
add
| [.[] | . as $f | .elements[]? | .steps[]? | select(.hidden != true)
    | {uri: $f.uri, line, keyword, name: (.name | gsub("\\|"; "\\|")), location: .match.location, status: .result.status}] as $lines
| ([$lines[] | select(.location != null)] | group_by(.location)
    | map({location: .[0].location, uses: length, example: .[0].name}) | sort_by(-.uses, .location)) as $defs
| [$defs[] | select(.uses == 1)] as $once
| [$lines[] | select(.status == "undefined")] as $undefined
| ($defs | length) as $n
| (if $n > 0 then (([$defs[].uses] | add) * 10 / $n | round) else 0 end) as $tenths
| "Steps: \($lines | length) lines · \($n) definitions · \($tenths / 10 | floor).\($tenths % 10) uses per definition · \($once | length) used once · \($undefined | length) undefined" as $line
| if ($summary | length) > 0 then $line else
    $line
    + (if $n > 0 then "\n\n| Uses | Definition | Example |\n|---:|---|---|\n" + ([$defs[:10][] | "| \(.uses) | `\(.location)` | \(.example) |"] | join("\n")) + "\n" else "" end)
    + (if ($once | length) > 0 then "\n**Used once**\n\n" + ([$once[] | "- `\(.location)` \(.example)"] | join("\n")) + "\n" else "" end)
    + (if ($undefined | length) > 0 then "\n**Undefined**\n\n" + ([$undefined[] | "- `\(.uri):\(.line)` \(.keyword)\(.name)"] | join("\n")) + "\n" else "" end)
  end
