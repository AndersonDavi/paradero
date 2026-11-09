#!/bin/zsh
# usage: render.sh name W H
D="$(cd "$(dirname "$0")" && pwd)"
agent-browser --session cards set viewport $2 $3 >/dev/null
agent-browser --session cards open "file://$D/$1.html" >/dev/null; sleep 2
agent-browser --session cards screenshot $D/$1.png >/dev/null
