Pac-12 Wordle — New Teams

A Wordle-style guessing game for the new Pac-12 teams, built with Node.js + Express and HTML/CSS/JS. Pac-12 inspired theme (deep blue + subtle gold), mobile-friendly, and AWS-ready.

Features
- Dataset of 8 teams in `data/teams.json`
- Server picks the answer each round; stored as a signed cookie token
- Guess feedback per column: State | City | Team Colors | Mascot | Stadium Size | Previous Conference
- Green = exact, Yellow = close (fuzzy), Red = no match
- 5-second visible timer starts after the first guess; auto-advances the pace
- Autocomplete for team names
- No database (in-memory)

Project Structure
