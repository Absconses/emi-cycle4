# Rend les esquisses d'une page en PNG (800x500), en version 48 couleurs (q*.png, celle qu'on
# place dans la frise) et en planche de contrôle.
# usage : python3 rendre.py [page.html] [numéros à mettre sur la planche]
import asyncio, os, sys, glob
from playwright.async_api import async_playwright
from PIL import Image
ici = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
page = args.pop(0) if args and args[0].endswith('.html') else '5-9-histoire-photo.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 800, 'height': 600})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto('file://' + ici + '/' + page)
        await pg.evaluate('document.fonts.ready')
        await pg.wait_for_timeout(400)
        n = await pg.evaluate('document.querySelectorAll("svg").length')
        for i in range(1, n + 1):
            await pg.locator('#s%d' % i).screenshot(path=ici + '/e%d.png' % i)
        await b.close()
        print(n, 'esquisses', errs)
        return n
n = asyncio.run(main())
for i in range(1, n + 1):
    Image.open(ici + '/e%d.png' % i).convert('RGB').quantize(48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(ici + '/q%d.png' % i, optimize=True)
sel = [int(a) for a in args] or list(range(1, n + 1))
ims = [Image.open(ici + '/e%d.png' % i) for i in sel]
cols = 2 if len(ims) > 1 else 1
rows = (len(ims) + cols - 1) // cols
pl = Image.new('RGB', (cols * 810, rows * 510), '#666')
for k, im in enumerate(ims):
    pl.paste(im, ((k % cols) * 810 + 5, (k // cols) * 510 + 5))
pl.save(ici + '/planche.png')
