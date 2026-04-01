---
name: social-horoscope-formatter
description: Formats horoscope texts for Mystická Hvězda social media, enforcing a strict 20 characters per line maximum with empty lines between sentences.
---

# Social Media Horoscope Formatter

When the user requests to format horoscopes (or any text) in the "social media format" or "Mysticka Hvezda format" (e.g. "zformátuj horoskop", "odřádkuj to jako vždycky", "připrav to pro sítě", "do sloupečku na 20 znaků"), please apply the following strict rules:

1. **Maximum 20 Characters Per Line**: You must rigorously break lines so that ABSOLUTELY NO line exceeds 20 characters (including spaces). 
2. **Empty Line Separators**: Between each sentence or logical thought, add an empty line. This creates a "breathable", easy-to-read structure. Do not lump all text together into a single block.
3. **No Formatting Artifacts**: Aside from the Zodiac sign header (e.g., `♈ BERAN`), do NOT use blockquote arrows (`>`), italics (`_`), or any markdown that might interfere with raw copying. 
4. **Code Block Export**: Output the final result inside a standard Markdown `text` block (i.e. \`\`\`text ... \`\`\`), so the user can use the "Copy" button in their chat UI.
5. **Validation Check**: Before finalizing your response, manually ensure your longest lines do not exceed the 20-character limit.

## Example Output Structure

```text
♈ BERAN

Den plný nové
energie a
příležitostí k
sebevyjádření.

Mars, tvůj vládce,
podporuje odvážné
kroky v oblasti
osobního rozvoje a
komunikace.

Využij tuto sílu k
tomu, abys zahájil
projekt, který
dlouho odkládáš.

Afirmace:
Má vnitřní síla hoří
jasným plamenem a
osvětluje cestu
vpřed.
```
