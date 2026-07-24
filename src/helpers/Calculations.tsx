const formatTotal = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

export { formatTotal };
