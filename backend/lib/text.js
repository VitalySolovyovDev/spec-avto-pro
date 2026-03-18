function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalText(value, maxLength = 255) {
  const normalizedValue = normalizeText(value);

  return normalizedValue ? normalizedValue.slice(0, maxLength) : null;
}

module.exports = {
  normalizeOptionalText,
  normalizeText,
};
