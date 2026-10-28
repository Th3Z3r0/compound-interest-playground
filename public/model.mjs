export const limits = { principal: [10, 10000], rate: [0, 30], years: [1, 30] };
export function settings(input) {
  const result = {};
  for (const [key, [min, max]] of Object.entries(limits)) {
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < min || value > max || (key === 'years' && !Number.isInteger(value))) throw new RangeError(`Invalid ${key}`);
    result[key] = value;
  }
  return result;
}
export function yearAt(input, year) {
  const { principal, rate, years } = settings(input);
  if (!Number.isInteger(year) || year < 0 || year > years) throw new RangeError('Invalid year');
  const balance = principal * (1 + rate / 100) ** year;
  const openingBalance = year ? principal * (1 + rate / 100) ** (year - 1) : principal;
  const onSavings = year ? principal * rate / 100 : 0;
  const onInterest = year ? Math.max(0, (openingBalance - principal) * rate / 100) : 0;
  return { year, balance, openingBalance, onSavings, onInterest, earned: onSavings + onInterest, totalInterest: balance - principal };
}

// Pure playback state keeps timers and UI in sync at the start and end.
export function playback(state, action, duration) {
  switch (action) {
    case 'play': return { year: state.year >= duration ? 0 : state.year, playing: true };
    case 'pause': return { ...state, playing: false };
    case 'reset': return { year: 0, playing: false };
    case 'replay': return { year: 0, playing: true };
    case 'next': return { year: Math.min(duration, state.year + 1), playing: false };
    case 'previous': return { year: Math.max(0, state.year - 1), playing: false };
    case 'tick': {
      if (!state.playing) return state;
      const year = Math.min(duration, state.year + 1);
      return { year, playing: year < duration };
    }
    default: throw new RangeError('Unknown playback action');
  }
}
