export const { CM, IN, MM } = { IN: "IN", CM: "CM", MM: "MM" };

export function getPtDensity(unitOfMeasure: string): number {
  switch (unitOfMeasure) {
    case CM:
      return 96 / 2.54;
    case MM:
      return 96 / 25.4;
    default:
      return 96;
  }
}
