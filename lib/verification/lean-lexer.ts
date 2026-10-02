// A source scanner, not an elaborator: Lean remains responsible for syntax validity.
// Keep identifiers whole so `sorry'`, `sorry₁`, and `«sorry»` are not admissions.
// Lean 4.29.1's isLetterLike/isIdFirst/isIdRest (Init/Meta/Defs.lean).
// Unicode categories alone miss valid symbol-like letters such as ℀.
function isLetterLike(char: string): boolean {
  const n = char.codePointAt(0) ?? 0;
  return (n >= 0x3b1 && n <= 0x3c9 && n !== 0x3bb) ||
    (n >= 0x391 && n <= 0x3a9 && n !== 0x3a0 && n !== 0x3a3) ||
    (n >= 0x3ca && n <= 0x3fb) || (n >= 0x1f00 && n <= 0x1ffe) ||
    (n >= 0x2100 && n <= 0x214f) || (n >= 0x1d49c && n <= 0x1d59f) ||
    (n >= 0xc0 && n <= 0xff && n !== 0xd7 && n !== 0xf7) ||
    (n >= 0x100 && n <= 0x17f);
}
function isIdStart(char: string): boolean {
  return /^[A-Za-z_]$/.test(char) || isLetterLike(char);
}
function isIdRest(char: string): boolean {
  const n = char.codePointAt(0) ?? 0;
  return /^[0-9'!?]$/.test(char) || isIdStart(char) ||
    (n >= 0x2080 && n <= 0x2089) || (n >= 0x2090 && n <= 0x209c) ||
    (n >= 0x1d62 && n <= 0x1d6a) || n === 0x2c7c;
}

export function leanTokens(source: string): string[] {
  const chars = Array.from(source);
  const tokens: string[] = [];
  let i = 0;
  const starts = (text: string) => chars.slice(i, i + text.length).join("") === text;
  const part = () => {
    if (chars[i] === "«") {
      i++;
      while (i < chars.length && chars[i] !== "»") i++;
      if (i < chars.length) i++;
      return true;
    }
    if (!isIdStart(chars[i] ?? "")) return false;
    i++;
    while (i < chars.length && isIdRest(chars[i])) i++;
    return true;
  };
  while (i < chars.length) {
    if (/\s/u.test(chars[i])) { i++; continue; }
    if (starts("--")) {
      while (i < chars.length && chars[i] !== "\n") i++;
      continue;
    }
    if (starts("/-")) {
      i += 2;
      let depth = 1;
      while (i < chars.length && depth > 0) {
        if (starts("/-")) { depth++; i += 2; }
        else if (starts("-/")) { depth--; i += 2; }
        else i++;
      }
      continue;
    }
    // Lean raw strings: r"...", r#"..."#, r##"..."##, etc.
    const raw = chars[i] === "r" ? sourceFrom(chars, i).match(/^r(#+)?"/) : null;
    if (raw) {
      const ending = `"${raw[1] ?? ""}`;
      i += raw[0].length;
      while (i < chars.length && !starts(ending)) i++;
      i = Math.min(chars.length, i + ending.length);
      tokens.push("<literal>");
      continue;
    }
    if (chars[i] === '"' || chars[i] === "'") {
      const quote = chars[i++];
      while (i < chars.length) {
        if (chars[i] === "\\") { i += 2; continue; }
        if (chars[i++] === quote) break;
      }
      tokens.push("<literal>");
      continue;
    }
    const start = i;
    if (part()) {
      while (chars[i] === ".") {
        const dot = i++;
        if (!part()) { i = dot; break; }
      }
      tokens.push(chars.slice(start, i).join(""));
    } else {
      tokens.push(chars[i++]);
    }
  }
  return tokens;
}

function sourceFrom(chars: string[], index: number): string {
  // Only inspect the raw-string prefix, avoiding a copy of the remaining source.
  let end = index + 1;
  while (chars[end] === "#") end++;
  return chars.slice(index, end + 1).join("");
}

export function isLeanName(token: string): boolean {
  return token !== "<literal>" && (token.startsWith("«") || isIdStart(Array.from(token)[0] ?? ""));
}

// Lean prints unnecessary identifier escapes without «». Preserve component
// boundaries: «a.b» is one component, whereas a.b is two.
export function leanNameKey(name: string): string {
  const parts: string[] = [];
  let part = "";
  let quoted = false;
  for (const char of name) {
    if (char === "«") quoted = true;
    else if (char === "»") quoted = false;
    else if (char === "." && !quoted) { parts.push(part); part = ""; }
    else part += char;
  }
  parts.push(part);
  if (parts[0] === "_root_") parts.shift();
  return JSON.stringify(parts);
}
