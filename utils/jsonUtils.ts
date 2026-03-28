export const cleanJsonResponse = (text: string) => {
    // Try to extract JSON if not pure JSON
    // First, try to find a markdown code block
    const markdownMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch) {
        return markdownMatch[1].trim();
    }

    // If no markdown block, find the first '{' or '[' and the last '}' or ']'
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');

    let start = -1;
    let end = -1;

    // Determine if we should look for an object or an array
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = lastBrace;
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1).trim();
    }

    // Fallback: remove markdown markers if present and trim
    return text.replace(/```json\n/g, '').replace(/```/g, '').trim();
};
