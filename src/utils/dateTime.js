const TIME_ZONE_SUFFIX_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const KOREAN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR-u-nu-latn', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const normalizeServerUtcDateTime = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed || TIME_ZONE_SUFFIX_PATTERN.test(trimmed)) return trimmed;

  // 백엔드 LocalDateTime은 UTC로 저장되지만 JSON에는 시간대 접미사가 없다.
  return `${trimmed}Z`;
};

export const formatUtcDateTimeInKorea = (value) => {
  const date = new Date(normalizeServerUtcDateTime(value));
  if (Number.isNaN(date.getTime())) return '';

  const parts = Object.fromEntries(
    KOREAN_DATE_TIME_FORMATTER
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: partValue }) => [type, partValue]),
  );

  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
};
