export function getSwitchColors(theme: string) {
  let track_false_color = '';
  let track_true_color = '';

  if (theme === 'light') {
    track_false_color = 'rgb(157, 157, 157)';
    track_true_color = 'rgb(110, 150, 242)';
  } else if (theme === 'dark') {
    track_false_color = 'rgb(153, 153, 153)';
    track_true_color = 'rgb(110, 150, 242)';
  }

  return {
    trackFalse: track_false_color,
    trackTrue: track_true_color,
    thumbColor: 'rgb(255, 255, 255)',
  };
}
