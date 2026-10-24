import re, sys, os
p = 'src/main/index.ts'
if not os.path.exists(p):
    sys.exit('ERROR: run this from the folder that contains package.json and src/ (cd there first)')
t = open(p, encoding='utf-8').read()
n = t.find("import('get-windows')")
if n < 0:
    print('No get-windows import found in', p, '- nothing to patch. Lines mentioning it:')
    for i, l in enumerate(t.splitlines(), 1):
        if 'get-windows' in l or 'getWindows' in l:
            print(i, l)
    sys.exit(0)
# find the 'try {' that opens the block containing the import
a = t.rfind('try {', 0, n)
# walk braces from that 'try {' to find the end of try block and the following catch block
def end_of_block(s, start):
    i = s.index('{', start); d = 0
    while i < len(s):
        if s[i] == '{': d += 1
        elif s[i] == '}':
            d -= 1
            if d == 0: return i + 1
        i += 1
    raise SystemExit('ERROR: could not match braces')
b = end_of_block(t, a)              # end of try {...}
m = re.match(r'\s*catch\b[^{]*', t[b:])
if m:
    b = end_of_block(t, b + m.end() - 1) if '{' in t[b:b+m.end()+1] else end_of_block(t, b + m.end())
# remove leading comment line just above 'try {' if it mentions get-windows
line_start = t.rfind('\n', 0, a) + 1
prev_start = t.rfind('\n', 0, line_start - 1) + 1
if 'get-windows' in t[prev_start:line_start]:
    line_start = prev_start
t = t[:line_start] + t[b:].lstrip('\n')
open(p, 'w', encoding='utf-8').write(t)
print('patched: removed the get-windows block')
left = [i for i, l in enumerate(t.splitlines(), 1) if "import('get-windows')" in l or "from 'get-windows'" in l]
print('remaining get-windows imports:', left)
