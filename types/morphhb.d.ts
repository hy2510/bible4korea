declare module "morphhb" {
  type MorphWord = [text: string, lemma: string, morphology: string];
  type MorphVerse = MorphWord[];
  type MorphChapter = MorphVerse[];
  type MorphBook = MorphChapter[];

  const morphhb: Record<string, MorphBook>;
  export = morphhb;
}
