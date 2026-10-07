---
workflow: general-video
flow: automation
storyboard: no
message: "Sandlot is a real, cinematic 3D baseball game you can play free in your browser"
destination: youtube
aspect: 1920x1080
language: en
length: 30s
angle: game trailer
---

## Intent

A 30-second trailer for Sandlot, the owner's browser baseball game. 3D, cinematic, high quality
(owner's words: "Make it about sandlot. 3d. Cinematic. High quality.").

## Assets

- assets/video/*.mp4 — eight shots filmed inside the real game (../capture: scripted plays, scripted camera moves, 1920x1080 30 fps).
- assets/logo.svg, assets/k.svg — Sandlot's own logo and word-art, exported from the game's code (src/ui/logo.js).
- assets/fonts — the game's own typefaces (Lilita One, Barlow Condensed).
- assets/audio — score, bat crack and crowd made in code (audio-src/compose.py); .media/audio/sfx — bundled cinematic hits.

## Notes

- No real player names or real club names on screen (the game's credits say they are for personal use only): the
  score box and name tags are hidden in the gameplay shot and the scoreboard's opponent is renamed "BAY".
- HeyGen was not signed in: no catalog music; the score is synthesized offline instead.
