export function currency(value) {
  return `$${Number(value).toFixed(2)}`;
}

export function buildDisplayLines(item) {
  const lines = [];
  if (item.sizeName) lines.push(`Size: ${item.sizeName}`);
  if (item.sugarLevel) lines.push(`Sugar: ${item.sugarLevel}`);
  if (item.iceLevel) lines.push(`Ice: ${item.iceLevel}`);
  if (item.toppingNames?.length) lines.push(`Toppings: ${item.toppingNames.join(", ")}`);
  if (item.comments) lines.push(`Note: ${item.comments}`);
  return lines;
}
