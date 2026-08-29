// Free-text interests are hard to match on; a fixed vocabulary keeps
// profiles comparable and the chips readable at a glance.
export const TRAVEL_STYLES = [
  "맛집 탐방",
  "액티비티",
  "휴양·힐링",
  "사진 찍기",
  "자연·트레킹",
  "도시 산책",
  "쇼핑",
  "박물관·전시",
  "페스티벌",
  "야경·술 한잔",
];

export const BUDGET_LEVELS = [
  { value: "budget", label: "가성비" },
  { value: "moderate", label: "적당히" },
  { value: "comfort", label: "편하게" },
];

export const PACE_LEVELS = [
  { value: "relaxed", label: "느긋하게" },
  { value: "balanced", label: "적당히" },
  { value: "packed", label: "알차게" },
];

function labelIn(options, value) {
  return options.find((o) => o.value === value)?.label ?? null;
}

export const budgetLabel = (value) => labelIn(BUDGET_LEVELS, value);
export const paceLabel = (value) => labelIn(PACE_LEVELS, value);
