function stripOuterQuotes(text) {
  return text.replace(/^["“”']+|["“”']+$/g, "").trim();
}

function extractQuotedMeaning(text) {
  const match = text.match(/[""]([^""]+)[""]/);
  return match?.[1]?.trim() ?? null;
}

function extractSlashGloss(text) {
  if (!/[/／]/.test(text)) return null;

  const parts = text
    .split(/[/／]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;
  return parts.slice(0, 2).join(", ");
}

function extractNumberedGloss(text) {
  if (!/\d+[.)）]/.test(text)) return null;

  const labelMatch = text.match(/^([^:：]{1,12})[:：]\s*/);
  const body = labelMatch ? text.slice(labelMatch[0].length) : text;
  const firstItemMatch = body.match(/\d+[.)）]\s*([\s\S]+?)(?=\s*\d+[.)）]|$)/);

  if (!firstItemMatch) return null;

  let firstItem = firstItemMatch[1].trim();
  const commaParts = firstItem.split(/[,，]/).map((part) => part.trim());
  if (commaParts[0]) {
    firstItem = commaParts[0];
  }

  if (labelMatch && firstItem.length <= 16) {
    const label = labelMatch[1].trim();
    if (label === firstItem) return label;
  }

  return firstItem;
}

function extractCommaGloss(text) {
  if (!/[,，]/.test(text)) return null;

  const parts = text
    .split(/[,，]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;
  return parts.slice(0, 2).join(", ");
}

export function simplifyGloss(raw) {
  if (!raw) return null;

  let text = stripOuterQuotes(raw.trim());
  if (!text) return null;

  const sectionIndex = text.indexOf("§");
  if (sectionIndex !== -1) {
    const beforeSection = text.slice(0, sectionIndex).trim();
    const nameMatch = beforeSection.match(/^["“]?([^":：]{1,12})[:：]/);
    if (nameMatch) return nameMatch[1].trim();

    const quoted = extractQuotedMeaning(text.slice(sectionIndex + 1));
    if (quoted && quoted.length <= 24) return quoted;
    text = beforeSection;
  }

  const colonMatch = text.match(/^([^:：]{1,20})[:：]\s*(.+)$/);
  if (colonMatch) {
    const label = colonMatch[1].trim();
    const rest = colonMatch[2].trim();
    const numbered = extractNumberedGloss(`${label}: ${rest}`);
    if (numbered) return numbered;
    if (rest.length <= 24) return rest;
    text = label;
  }

  return (
    extractSlashGloss(text) ??
    extractNumberedGloss(text) ??
    extractCommaGloss(text) ??
    (text.length > 28 ? `${text.slice(0, 25)}...` : text)
  );
}

export function extractBriefGloss(definition) {
  return simplifyGloss(definition.replace(/^\[번역 없음\]:\s*/, "").trim()) ?? "";
}
