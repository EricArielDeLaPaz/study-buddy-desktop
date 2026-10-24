import re,sys
p='src/main/index.ts'
t=open(p,encoding='utf-8').read()
a=t.index('  // 1. Try get-windows first')
b=t.index('  // 2. Built-in OS Fallback')
t=t[:a]+'  // Built-in OS lookup (get-windows was removed)\n'+t[b+len('  // 2. Built-in OS Fallback\n'):]
open(p,'w',encoding='utf-8').write(t)
print('patched')
