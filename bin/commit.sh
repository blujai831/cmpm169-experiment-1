#!/bin/bash

# === Get current time ===

date=($(date +"%a %b %d %Y %I %M %S %P %Z"))
fname="$(printf "%s-%s-%s-%s-%s-%s-%s-%s-%s" ${date[@]})"
pretty_date="$(printf "%s, %s %s %s, %s:%s:%s%s %s" ${date[@]})"

echo "$pretty_date"

# === Get commit message and devlog entry ===

read -p "Commit message: " -e commit_message
# Not strictly necessary (subprocess shenanigans)
this_commit_message="$commit_message"

"$EDITOR" "$fname.tmp"
if [[ ! -e "$fname.tmp" ]]; then
    echo>&2 "Cancelled."
    exit 1
fi

devlog_entry="$(<"$fname.tmp")"
rm -f "$fname.tmp"
cat << EOT
Devlog entry:
$devlog_entry
EOT
# Try to ensure whole message is printed before taking screenshot
sleep 0.1

# === Create devlog entry and screenshot ===

scrot -bmF "devlog/${fname}.png"
cat > "devlog/${fname}.txt" << EOT
$pretty_date
$commit_message
$devlog_entry
EOT

# === Find all devlog entries to date in reverse chronological order ===

fnames=()
while read fname; do fnames[$((${#fnames[@]}+1))]="$fname"; done < <(
    find devlog -maxdepth 1 -name "*.txt" -printf "%T@ %p\n" |
        sort -rn |
        cut -d' ' -f2
)

# === Rebuild devlog/index.html based on that information ===

# --- Preamble ---

cat > devlog/index.html << EOT
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="./style.css" />
    <title>Devlog</title>
</head>
<body>
<header><h1>Devlog</h1></header>
<nav><ul id="table-of-contents">
    <li><a href="..">Back</a></li>
EOT

# --- Table of contents ---

for fname in "${fnames[@]}"; do
    basefname="$(basename -s .txt "$fname")"
    cat "$fname" | (
        read pretty_date
        read commit_message
        cat >> devlog/index.html << EOT
    <li><a href="#$basefname">$pretty_date&mdash;$commit_message</a></li>
EOT
    )
done

# --- Separator between table of contents and list of entries ---

cat >> devlog/index.html << EOT
</ul></nav>
<main><ul id="entries">
EOT

# --- List of entries ---

for fname in "${fnames[@]}"; do
    basefname="$(basename -s .txt "$fname")"
    imgfname="$basefname.png"
    cat "$fname" | (
        read pretty_date
        read commit_message
        cat >> devlog/index.html << EOT
<li id="$basefname">
    <h2>$pretty_date&mdash;$commit_message</h2>
    <a href="$imgfname"><img src="$imgfname" alt="$commit_message" /></a>
EOT
        while read line; do
            wordsplit=($line)
            line="${wordsplit[*]}"
            if [[ "$line" ]]; then
                cat >> devlog/index.html << EOT
    <p>$line</p>
EOT
            fi
        done
        cat >> devlog/index.html << EOT
    <p><a href="#table-of-contents">Back to top</a></p>
</li>
EOT
    )
done

# --- Postscript ---

cat >> devlog/index.html << EOT
</ul></main>
</body>
</html>
EOT

# === Create commit ===

git add devlog
git commit -m "$this_commit_message"
