// @ts-check
/** Latest messages are authoritative; external text never enters this function.
 * @param {string[]} prompts */
export function activeIntent(prompts = []) {
  return prompts
    .filter((p) => typeof p === "string" && p.trim())
    .slice(-3)
    .map((p, i) => `${i + 1}. ${p.slice(0, 1400)}`)
    .join("\n");
}
