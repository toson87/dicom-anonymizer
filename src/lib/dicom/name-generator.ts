// Deterministic fake name generation via FNV-1a hash.
// Produces consistent, realistic-looking names for the same input + salt.

const LAST_NAMES = [
  'SMITH', 'JOHNSON', 'WILLIAMS', 'JONES', 'BROWN', 'DAVIS', 'MILLER', 'WILSON',
  'MOORE', 'TAYLOR', 'ANDERSON', 'THOMAS', 'JACKSON', 'WHITE', 'HARRIS', 'MARTIN',
  'THOMPSON', 'GARCIA', 'MARTINEZ', 'ROBINSON', 'CLARK', 'LEWIS', 'LEE', 'WALKER',
  'HALL', 'ALLEN', 'YOUNG', 'KING', 'WRIGHT', 'LOPEZ', 'HILL', 'SCOTT', 'GREEN',
  'ADAMS', 'NELSON', 'CARTER', 'ROBERTS', 'PHILLIPS', 'CAMPBELL', 'PARKER', 'EDWARDS',
  'COLLINS', 'REEVES', 'STEWART', 'MORRIS', 'ROGERS', 'COOK', 'MORGAN', 'PETERSON',
  'COOPER', 'REED', 'BELL', 'HOWARD'
]

const FIRST_NAMES = [
  'JAMES', 'JOHN', 'ROBERT', 'MICHAEL', 'WILLIAM', 'DAVID', 'RICHARD', 'JOSEPH',
  'THOMAS', 'CHARLES', 'CHRISTOPHER', 'DANIEL', 'MATTHEW', 'ANTHONY', 'DONALD',
  'STEVEN', 'ANDREW', 'KENNETH', 'GEORGE', 'BRIAN', 'EDWARD', 'RONALD', 'TIMOTHY',
  'JASON', 'JEFFREY', 'RYAN', 'JACOB', 'GARY', 'NICHOLAS', 'ERIC', 'JONATHAN',
  'STEPHEN', 'LARRY', 'JUSTIN', 'SCOTT', 'BRANDON', 'BENJAMIN', 'SAMUEL', 'FRANK',
  'GREGORY', 'ALEXANDER', 'RAYMOND', 'PATRICK', 'JACK', 'DENNIS', 'JERRY', 'TYLER',
  'AARON', 'JOSE', 'ADAM', 'HENRY', 'PETER', 'ZACHARY'
]

function hashFNV1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    const b = input.charCodeAt(i) & 0xff
    hash = (Math.imul(hash ^ b, 0x01000193)) >>> 0
  }
  return Math.abs(hash)
}

export function generateFakeName(originalValue: string, salt: string): string {
  const input = salt + '|' + originalValue
  const hash = hashFNV1a(input)

  const lastIdx = (hash % LAST_NAMES.length) | 0
  const firstIdx = ((hash >>> 16) % FIRST_NAMES.length) | 0

  return LAST_NAMES[lastIdx] + '^' + FIRST_NAMES[firstIdx]
}
