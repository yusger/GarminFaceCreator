# Character asset prompts

Tool: built-in image_gen. One separate transparent PNG generated for each state. Input: the corresponding user-provided complete design, used as character/style reference only. No third-party fonts or downloaded character art were used.

## Shared prompt

Create ONE production transparent PNG cutout for PulseManiac watchface using provided image as STYLE/CHARACTER reference. Extract/recreate only the central chalk-drawn black stick character with thick textured off-white outline, matching the reference character. Entire background genuinely transparent: no watch circle, no clock, no date, no ground, no labels, no digits, no heart symbol, no watermark. Character chest is a completely blank dark area reserved for runtime HR text. CRITICAL registration: square canvas, head centered horizontally near x=50%,y=24%; blank chest anchor at x=50%,y=49%; feet stop near y=86%; whole character including accents inside x=12..88%,y=8..92%. Chest must remain around same anchor across states. Bold simple strokes recognizable when scaled to 160px. Preserve dark body fill (not transparent body interior); white chalk outline visible on dark background. No frame or comparison sheet.

## State additions

- Rest: relaxed upright standing chalk stick character, arms down, feet close, quiet neutral eyes. No decoration.
- Ready: slightly bent knees, one hand slightly raised, closed eyes and calm smile, one or two subtle pale motion arcs.
- Twist: bent knees, elbows out in a mildly twisting static pose, scrunched eyes, few yellow #FFC107 accents.
- Maniac: comically exaggerated pose, one arm raised, other flung outward, bent legs, shouting cartoon face, white sweat drops and red #F44336 lightning accents. A single STATIC pose, no animation. Do NOT include Chinese words.

## Ready face correction

Precise edit of this transparent PNG. Change ONLY the face/head interior from white to charcoal BLACK matching the black torso, and change the two closed-eye eyelid marks to off-white chalk. Preserve the exact round head silhouette, outer white chalk outline, closed relaxed expression, body pose, hands, feet, chest blank space, small motion strokes, dimensions, composition, and genuine background alpha transparency. No added text or numbers. The other three characters use black heads with white features; this character must match that style. Keep every other area unchanged. Output one transparent character PNG.

The selected corrected image is ready.png. Other original/discarded generated variants are not required by the project. Native target-size image scaling is performed by the Garmin resource compiler.


## Static layout revision v2
Tool: built-in imagegen. Inputs: user rest-state complete-watchface reference for background/ring, existing selected transparent maniac character for body edit. No animation added.

Background prompt: opaque square blackboard charcoal texture near #141414, rubbed smears, erasures and grain; no subjects, ring, text or watermark.
Ring prompt: transparent square rough interrupted white chalk circle, center 50%, radius about 47%, around 12 irregular ticks, middle 80% diameter empty; no character, text or opaque background.
Maniac edit prompt: preserve selected black head, yelling face, body, chest anchor and scale; add two to three rough pale ghost contours behind arms and legs, static speed trails and red accents; no animation, text or heart; true alpha.

Heart outlines are repository-native SVG geometry, rasterized for Garmin resources; live heart-rate digits are separate code controls. Licensed Permanent Marker and Ma Shan Zheng fonts are separately pinned in PulseManiac-Font-Sources.json with full notices.
