# ShubhLabh AI Course: design notes

**Idea:** Shubh Labh (शुभ लाभ, "auspicious gain") is written on Diwali ledgers. The course is kept like a ledger: remove the noise, find the structure, keep the gain.
**Signature:** one 3D point cloud (OGL, 11k points) that morphs noise -> neural lattice -> endless knot as the pinned hero scrolls. Camera dollies and the cloud rotates on one driver (scroll progress 0..3).
**Idle state:** the cloud breathes when nothing moves; the scroll hint drips.
**Palette:** ground #130e0b, paper #f2e9d8, ink #1b1410, gold #e8a317, sindoor #b53219.
**Type:** Fraunces (display), Hanken Grotesk (body), Tiro Devanagari Hindi (brand mark). All self-hosted.
**Motion verb:** tally. Rows fill like a ledger line being struck, buttons fill from below.
**Fallbacks:** reduced motion or no WebGL gives a static, fully visible hero stack.

## Assumptions to replace (all placeholders)
- Domain `shubhlabh.example` and email `hello@shubhlabh.example` (src/data/site.ts, astro.config.mjs, public/robots.txt)
- Course format: 8 weeks, two live evening sessions a week, syllabus, FAQ answers
- Cohort dates and fee (the page says they go to the waitlist)
- Waitlist form opens the visitor's mail app; connect a real backend later
- No instructor bio, testimonials or metrics were invented. Add real ones.
