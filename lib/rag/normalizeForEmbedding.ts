/**
 * Collapses the stylized "S.C.O.R.E." acronym to a plain, undotted form
 * before text is sent to the embedding model. Measured directly against
 * text-embedding-3-small: the dotted and undotted forms embed far enough
 * apart (~0.3 cosine similarity gap) that a casual question like
 * "what is score?" missed the retrieval similarity threshold entirely,
 * even though the knowledge base has a chunk that answers it exactly.
 * Applied identically to indexed content and incoming questions so both
 * sides land in the same region of embedding space. Only affects the text
 * sent to the embedding API — stored/displayed content keeps its original
 * "S.C.O.R.E." styling.
 */
export function normalizeForEmbedding(text: string): string {
  return text.replace(/\bS\.C\.O\.R\.E\.?(?=\W|$)/gi, "SCORE");
}
