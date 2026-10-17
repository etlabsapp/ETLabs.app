#!/usr/bin/env python3
"""Lattice³ 'COMING SOON' stamp for the home + /products Lattice³ card (Engineering, Oct 17 2026).
No Design asset existed for Lattice³, so this reuses Design's seal geometry and outline-text helpers from
/workspace/design/myhq-stamp-1017/junior-sticker/make_sticker.py (same family as the MyHQ stamp: 48-point
rosette, #B42318 disc, outer ring, dashed inner ring, white die-cut edge, offset shadow). Text is outlined
(Barlow Semi Condensed, OFL): no fonts, no <style>, CSP-safe. Only words: COMING SOON. Ring arcs carry stars
only (no new copy). Icon: an original line cube.
Usage: python3 scripts/make_lattice_stamp.py  -> assets/images/lattice-coming-soon-stamp.svg"""
import sys, os, math, html
sys.path.insert(0, '/workspace/design/myhq-stamp-1017/junior-sticker')
import make_sticker as M
C = M.C
def cube(ink):
    cx, cy, s = C, 86, 13
    # isometric cube outline + inner edges
    p = lambda x, y: f'{cx + x:.1f} {cy + y:.1f}'
    top = [p(0, -s), p(s * .87, -s / 2), p(0, 0), p(-s * .87, -s / 2)]
    outer = [p(0, -s), p(s * .87, -s / 2), p(s * .87, s / 2), p(0, s), p(-s * .87, s / 2), p(-s * .87, -s / 2)]
    return (f'<path d="M{" L".join(outer)}Z" fill="none" stroke="{ink}" stroke-width="2.3" stroke-linejoin="round"/>'
            f'<path d="M{p(-s * .87, -s / 2)} L{p(0, 0)} L{p(s * .87, -s / 2)} M{p(0, 0)} L{p(0, s)}" fill="none" stroke="{ink}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>')
def build(alt='Coming soon'):
    rosette, disc, ink, line_c, edge, shadow_op = '#912018', '#B42318', '#FFFFFF', '#FFFFFF', '#FFFFFF', 0.22
    pts = [f"{C + (118 if i % 2 == 0 else 106) * math.cos(math.pi * i / 24 - math.pi / 2):.1f} {C + (118 if i % 2 == 0 else 106) * math.sin(math.pi * i / 24 - math.pi / 2):.1f}" for i in range(48)]
    ros = 'M' + ' L'.join(pts) + 'Z'
    stars_bot = ' '.join(M.star(C + 84 * math.sin(math.radians(a)), C + 84 * math.cos(math.radians(a)), 5, 2.1) for a in (-22, 0, 22))
    stars_top = ' '.join(M.star(C + 84 * math.sin(math.radians(a)), C - 84 * math.cos(math.radians(a)), 5, 2.1) for a in (-22, 0, 22))
    lines = ['COMING', 'SOON']; size = M.fit_center(lines)
    cl = ' '.join(M.line(M.F_MAIN, l, size, C, 133 + i * size * 0.98, 0.6) for i, l in enumerate(lines))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 250 252" width="250" height="252" role="img" aria-label="{html.escape(alt)}">
<title>{html.escape(alt)}</title>
<g aria-hidden="true">
<path d="{ros}" transform="translate(2.5 4)" fill="#000000" fill-opacity="{shadow_op}" stroke="#000000" stroke-opacity="{shadow_op}" stroke-width="9" stroke-linejoin="round"/>
<path d="{ros}" fill="{edge}" stroke="{edge}" stroke-width="9" stroke-linejoin="round"/>
<path d="{ros}" fill="{rosette}"/>
<circle cx="{C}" cy="{C}" r="102" fill="{disc}"/>
<circle cx="{C}" cy="{C}" r="97" fill="none" stroke="{line_c}" stroke-width="2"/>
<circle cx="{C}" cy="{C}" r="66" fill="none" stroke="{line_c}" stroke-width="1.5" stroke-dasharray="2 4"/>
<path d="{stars_top} {stars_bot}" fill="{ink}"/>
<path d="{M.star(C - 84, C, 6, 2.5)} {M.star(C + 84, C, 6, 2.5)}" fill="{ink}"/>
{cube(ink)}
<path d="{cl}" fill="{ink}"/>
</g></svg>'''
if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'images', 'lattice-coming-soon-stamp.svg')
    svg = build(); open(out, 'w').write(svg); print(out, f'{len(svg)/1024:.1f} KB')
