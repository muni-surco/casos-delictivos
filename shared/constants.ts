export const crimeTypes = [
  "Robo",
  "Hurto",
  "Asalto",
  "Homicidio",
  "Secuestro",
  "Violación",
  "Narcotráfico",
  "Extorsión",
  "Fraude",
  "Violencia doméstica",
  "Vandalismo",
  "Otro"
] as const;

export type CrimeType = typeof crimeTypes[number];