export function normalizeMainsQuestionText(
  value: unknown
): string {

  return String(
    value ?? ''
  )
    .normalize(
      'NFKC'
    )
    .toLowerCase()
    .replace(
      /[“”]/g,
      '"'
    )
    .replace(
      /[‘’]/g,
      "'"
    )
    .replace(
      /[.,!?;:()[\]{}"'“”‘’\-–—_/\\]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


export function dedupeMainsQuestions<
  T extends {
    question: string;
  }
>(
  items: T[]
): T[] {

  const seen =
    new Set<string>();


  return items.filter(
    item => {

      const key =
        normalizeMainsQuestionText(
          item.question
        );


      if (
        !key
      ) {
        return true;
      }


      if (
        seen.has(
          key
        )
      ) {
        return false;
      }


      seen.add(
        key
      );

      return true;
    }
  );
}
