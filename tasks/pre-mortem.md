# Pre-Mortem: Names Database Expansion

**Risk Level**: Medium

### Potential Failure Modes
1. **Data Degradation**: Automated descriptions for new names might feel "hallucinated" compared to the existing 20 manual entries.
    - *Mitigation*: I will use a multi-step generation prompt for the subagent to ensure high-quality Czech text and preserve existing entries.
2. **Encoding Corruption**: Special Czech characters (ě, š, č, ř, ž, ý, á, í, é) could be corrupted during the JSON write.
    - *Mitigation*: I will verify the file encoding after writing and use a diagnostic script to check for invalid characters.
3. **Numerology Inconsistency**: If users calculate their numerology elsewhere and see a different result here, it breaks trust.
    - *Mitigation*: I will use provide a clear mapping table in the script and document the logic.

### "The 10-Minute Crash" Scenario
*If this breaks in 10 minutes, the most likely culprit is...*
A malformed JSON comma or bracket that causes the `fetch()` in `jmena/index.html` to fail, resulting in a blank page or console error.
