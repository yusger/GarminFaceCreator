# PulseManiac artwork and implementation provenance

PulseManiac is a user-provided original watchface concept. The four supplied design references and local drafting notes remain in the ignored local temporary folder and are not redistributed here. Character cutouts were adapted from those references using the built-in image_gen tool; the ready-state face was revised to black with white closed eyes at the designer's request. These are static poses, not animation frames.

The generated rest/ready/twist/maniac PNG files preserve transparency and contain no time, date or heart-rate digits. Background SVG is code-native deterministic artwork produced for this implementation. Runtime text uses device system fonts; no SDK font binaries are distributed. Heart symbols use the separately credited Lucide heart-pulse icon and retain its ISC/Feather notices in source exports.

Creator implementation/templates retain the repository GPL-3.0-or-later license. This statement documents artwork origin and does not automatically relicense the designer's artwork, trademarks, or independent user inputs. The copyright and applicable rights of the original design remain with their respective holders. Preserve this notice with exported PulseManiac designs and assets.

Layout: configurable top battery/steps slots; fixed chest HR; one local date and bottom clock. HR ranges: <100; [100,120); [120,140]; >140. Missing HR and AOD select the neutral rest pose. No automatic network requests, active HR sampling or pose animation are added.
