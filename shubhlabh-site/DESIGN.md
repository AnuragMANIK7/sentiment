# ShubhLabh AI Course: design notes

## Concept card
- **Idea:** one lamp in the dark becomes a field of lamps. Learning AI is lighting the way through noise.
- **Metaphor:** Diwali, when lamps are lit and *Shubh Labh* (शुभ लाभ, "auspicious gain") is written on the new ledger.
- **Signature:** one continuous WebGL world the camera travels through on scroll:
  1. **Lamp:** a brass diya lights after the loader, with a flame shader and a real point light.
  2. **Noise:** the embers swirl into a cloud.
  3. **Structure:** the cloud settles into a neural lattice, with pulses of light travelling layer to layer.
  4. **Ledger:** eight glass tablets (transmission material), each refracting a gold Devanagari numeral and the week's title. The week in front of the camera glows.
  5. **Gain:** a solid gold endless knot.
  6. **Cohort:** the camera rises over a rangoli that draws itself outward while rings of clay diyas light from the centre.
- **Motion verb:** kindle. Headings are lit by a passing flame edge, labels decode, and buttons fill from below like light rising.
- **Idle state:** the flame flickers and sways with the pointer, embers rise, the lattice breathes, the knot turns and the HUD clock ticks.
- **Sound:** an optional tanpura drone (Pa, Sa, Sa, low Sa) synthesised with Web Audio, off by default. A small bell rings when a new week comes into view.

## System
- **Palette:**
  - ground #0b0806
  - paper #f2e9d8
  - ink #1b1410
  - gold #e8a317
  - gold-hi #ffd27a
  - sindoor #b53219
- **Type:**
  - Fraunces for display.
  - Hanken Grotesk for body.
  - JetBrains Mono for the HUD and labels.
  - Tiro Devanagari Hindi for the brand and numerals.
  - All self-hosted.
- **HUD:**
  - The chapter readout counts 01 to 08 and shows the current week.
  - The clock shows India time, because live sessions run in the evening, India time.
  - A progress ruler tracks how far down the page you are.
  - The sound toggle has four bars that pulse with each plucked string.
- **Ledger interlude:** the Fit and Questions sections are a paper page with the red binding, ruled lines and red margin of a *bahi-khata*. Rendering pauses while paper covers the screen.
- **Fallback:** reduced motion, Save-Data or no WebGL2 skip the world and the loader. Each section then paints its own still version.

## Assumptions to replace (all placeholders)
- The domain `shubhlabh.example` and the email `hello@shubhlabh.example`. They appear in `src/data/site.ts`, `astro.config.mjs` and `public/robots.txt`.
- The course format: 8 weeks, two live evening sessions a week. Also the syllabus and the FAQ answers.
- Cohort dates and fee. The page says they go to the waitlist first.
- The waitlist form opens the visitor's mail app. Connect a real backend later.
- No instructor bio, testimonials or metrics were invented. Add real ones.
