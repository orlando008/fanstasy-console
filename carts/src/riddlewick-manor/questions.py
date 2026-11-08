# Riddlewick Manor's question bank: checks questions.txt and packs it into the cart's ROM (rom/questions.bin).
#   python3 carts/src/riddlewick-manor/questions.py            write rom/questions.bin
#   python3 carts/src/riddlewick-manor/questions.py --check    only check (exit 1 on a problem, or if the .bin is stale)
# The checks: the line's shape, a known subject and a difficulty 1 to 4, the lengths (a question 90 characters, an
# answer 26), plain printable ASCII, four different answers, no question twice; and a count by subject and difficulty.
#
# The ROM blob, read by code.js (loadQuestions):
#   'RQ', a version byte (1), the count (2 bytes, little-endian), then each question: its subject (0 to 7, in SUBJECTS'
#   order) and difficulty (1 to 4) as two bytes, then five strings (the question, the right answer, three wrong ones),
#   each a length byte and its characters.
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SUBJECTS = ['HIS', 'GEO', 'SCI', 'NAT', 'ART', 'MUS', 'SPO', 'FOO']
MAX_Q, MAX_A = 90, 26


def read(path):
    out, problems = [], []
    for n, line in enumerate(open(path, encoding='utf-8').read().split('\n'), 1):
        if not line.strip() or line.startswith('#'): continue
        parts = [p.strip() for p in line.split('|')]
        where = 'line %d' % n
        if len(parts) != 6: problems.append('%s: %d parts, not 6' % (where, len(parts))); continue
        head = parts[0].split()
        if len(head) != 2 or head[0] not in SUBJECTS or head[1] not in '1234' or len(head[1]) != 1:
            problems.append('%s: "%s" is not a subject and a difficulty 1 to 4' % (where, parts[0])); continue
        q, answers = parts[1], parts[2:]
        if not q or len(q) > MAX_Q: problems.append('%s: the question is %d characters (at most %d)' % (where, len(q), MAX_Q))
        for a in answers:
            if not a or len(a) > MAX_A: problems.append('%s: the answer "%s" is %d characters (at most %d)' % (where, a, len(a), MAX_A))
        for s in [q] + answers:
            if any(not (32 <= ord(c) <= 126) for c in s): problems.append('%s: "%s" is not plain ASCII' % (where, s))
        if len({a.lower() for a in answers}) != 4: problems.append('%s: two answers are the same' % where)
        out.append((SUBJECTS.index(head[0]), int(head[1]), q, answers, n))
    seen = {}
    for s, d, q, a, n in out:
        k = q.lower()
        if k in seen: problems.append('line %d: the same question as line %d' % (n, seen[k]))
        seen[k] = n
    return out, problems


def pack(qs):
    b = bytearray(b'RQ') + bytes([1]) + len(qs).to_bytes(2, 'little')
    for s, d, q, answers, _ in qs:
        b += bytes([s, d])
        for t in [q] + answers:
            e = t.encode('ascii'); b += bytes([len(e)]) + e
    return bytes(b)


def main():
    qs, problems = read(os.path.join(HERE, 'questions.txt'))
    out = os.path.join(HERE, 'rom', 'questions.bin')
    data = pack(qs)
    if '--check' in sys.argv and not problems and (not os.path.exists(out) or open(out, 'rb').read() != data):
        problems.append('rom/questions.bin is not what questions.txt makes: run python3 carts/src/riddlewick-manor/questions.py')
    for p in problems: print('problem:', p)
    counts = [[0] * 5 for _ in SUBJECTS]
    for s, d, *_ in qs: counts[s][d] += 1
    print('%d questions, %d bytes' % (len(qs), len(data)))
    print('       ' + '  '.join('d%d' % d for d in range(1, 5)))
    for i, name in enumerate(SUBJECTS): print('  %s  ' % name + '  '.join('%2d' % counts[i][d] for d in range(1, 5)))
    if problems: sys.exit(1)
    if '--check' not in sys.argv:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(data)


if __name__ == '__main__':
    main()
