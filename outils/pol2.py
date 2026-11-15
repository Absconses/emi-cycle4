# Polices de la plateforme, servies depuis une copie locale quand Google Fonts est injoignable (tests sans réseau).
# Installation :  npm i @fontsource/bricolage-grotesque @fontsource/ibm-plex-mono @fontsource/atkinson-hyperlegible
import os
# Dossier des polices installées par npm (paquets @fontsource) ; variable POLICES pour le changer.
R=os.environ.get('POLICES','/home/claude/fonts/node_modules/@fontsource/')
F=[('Bricolage Grotesque','bricolage-grotesque',600),('Bricolage Grotesque','bricolage-grotesque',800),('IBM Plex Mono','ibm-plex-mono',500),('IBM Plex Mono','ibm-plex-mono',600),
   ('Atkinson Hyperlegible','atkinson-hyperlegible',400),('Atkinson Hyperlegible','atkinson-hyperlegible',700)]
CSS=''.join(f"@font-face{{font-family:'{n}';font-weight:{w};font-style:normal;src:url(https://polices.local/{p}/files/{p}-latin-{w}-normal.woff2) format('woff2');}}" for n,p,w in F)
def brancher(pg):
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=CSS))
    pg.route('https://polices.local/**', lambda r: r.fulfill(status=200, content_type='font/woff2', headers={'access-control-allow-origin':'*'}, body=open(R+r.request.url.split('polices.local/')[1],'rb').read()))
