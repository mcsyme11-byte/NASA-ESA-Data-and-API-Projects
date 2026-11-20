#!/usr/bin/env python3
# NASA and ESA Data Projects · the documents check · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Keeps every place that describes the site in step with the site itself (added Nov 18, 2026, after the Project
# Record, the README and then CLAUDE.md, the About page and the project setup text still named three projects a day
# after Orbit & Space Watch went live). Run by GitHub after every push (.github/workflows/checks.yml) and by hand:
#   python3 dev/check_docs.py        (exit 1 lists every problem)
#
# The one list of what is live is SECTIONS in shared/footer.js. From it, the check requires:
#   1. every live project and tool by name in each of the full lists (FULL below): CLAUDE.md's table, README.md, the
#      Project Record's "The projects at a glance" (docs/record/front.md), the About page and the Claude project
#      instructions (docs/CLAUDE-PROJECT-SETUP.md); none of them calling a live one "planned";
#   2. the site's sections (the three projects and Orbit & Space Watch) in each short description (SHORT below): the
#      home page's description, the app description in site.webmanifest and the Claude project description;
#   3. links to every live project from the home page, and to every Space Watch tool from space-watch/;
#   4. every page in SECTIONS existing, and named in the Back-button list (NAMES in shared/footer.js);
#   5. every project folder having a README.md that is listed in the Project Record's PARTS;
#   6. no folder of pages outside SECTIONS that is not in SITE_PAGES (a new tool must be added to SECTIONS);
#   7. none of the general documents speaking of "three projects" or the like;
#   8. docs/ROADMAP.md keeping its shape: numbered sections in order with none missing, no finished "[x]" items (they
#      move to CHANGELOG.md), no indented line left alone after the item above it was removed;
#   9. every link from one document to a file of the repository pointing to a file that exists (handoffs, which
#      record a moment, are left out);
#  10. every page's preview card tags (dev/build_social.py --check, Nov 19, 2026);
#  11. the credit "© 2026 Malcolm Syme · mcsyme11@gmail.com" on every document and file of code, and the NEDAP patch
#      at the top of every Markdown document (dev/brand_files.py --check, Nov 19, 2026).
# docs/CHECKS.md is the full checklist for a repo-wide or site-wide check; this script is its first step.
import json, os, re, subprocess, sys
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda f: open(os.path.join(ROOT, f), encoding='utf-8').read()

# folders of pages that are site pages, not projects or tools (CLAUDE.md lists them under the table)
SITE_PAGES = {'about', 'contact', 'credits', 'legal', 'privacy', 'terms', 'data-collection', 'control-room', 'design',
              'space-watch', 'shared', 'brand', 'docs', 'dev'}
# the general documents that describe the whole site (item 7)
GENERAL = ['CLAUDE.md', 'README.md', 'docs/record/front.md', 'about/index.html', 'index.html', 'site.webmanifest',
           'docs/CLAUDE-PROJECT-SETUP.md']


def sections():
    """SECTIONS from shared/footer.js as [(section, [(label, url, soon), ...]), ...]."""
    js = read('shared/footer.js')
    body = js[js.index('const SECTIONS = ['):]
    body = body[body.index('['):body.index('\n];') + 2]
    body = re.sub(r'//[^\n]*', '', body).replace("'", '"')
    body = re.sub(r'([{,]\s*)(\w+)\s*:', r'\1"\2":', body)          # { soon: true, added: "…" } as JSON
    body = re.sub(r',\s*([\]}])', r'\1', body)
    return [(name, [(i[0], i[1], bool(len(i) > 2 and i[2].get('soon'))) for i in items]) for name, items in json.loads(body)]


def live():
    """[(name, folder, section)] for every live project and tool."""
    out = []
    for name, items in sections():
        items = [(l, u) for l, u, soon in items if not soon]
        if name == 'Space Watch':
            out += [(l, u.split('/')[0], 'Orbit & Space Watch') for l, u in items if l != 'Overview']
        elif name == 'More':
            out += [(l, u.split('/')[0], 'Utility') for l, u in items if u in ('sky-finder/', 'spacecraft/')]
        elif items:
            out.append((name, items[0][1].split('/')[0], 'Project'))
    return out


def plain(s):
    return s.replace('&amp;', '&').replace('&#39;', "'").replace('’', "'")


def main():
    problems = []
    tools = live()
    names = [n for n, f, s in tools]

    # 1. the full lists
    claude, readme, front = read('CLAUDE.md'), read('README.md'), read('docs/record/front.md')
    about = plain(read('about/index.html'))
    setup = read('docs/CLAUDE-PROJECT-SETUP.md')
    instr = setup[setup.index('## Project instructions'):]
    glance = front[front.index('# The projects at a glance'):]
    glance = glance[:glance.index('\n# ', 2)] if '\n# ' in glance[2:] else glance
    for n, folder, sec in tools:
        if not any(l.startswith('|') and f'**{n}**' in l and f'`{folder}/`' in l for l in claude.split('\n')):
            problems.append(f'CLAUDE.md: "{n}" (`{folder}/`) is live on the site but has no row in the table at the top')
        if not re.search(r'\*\*\[?' + re.escape(n) + r'\]?\**', readme, re.I):
            problems.append(f'README.md: "{n}" is live on the site but not in the project tables')
        row = next((l for l in glance.split('\n') if l.startswith('|') and n.lower() in l.lower()), None)
        if not row:
            problems.append(f'docs/record/front.md: "{n}" is live but has no row in "The projects at a glance"')
        elif re.search(r'\|\s*Planned', row):
            problems.append(f'docs/record/front.md: "{n}" is live but its row still says "Planned"')
        if not re.search(r'>\s*' + r'\s+'.join(map(re.escape, n.split())) + r'\s*</a>', about, re.I):
            problems.append(f'about/index.html: "{n}" is live but the About page does not name and link it')
        if folder + '/' not in instr or n.lower() not in instr.lower():
            problems.append(f'docs/CLAUDE-PROJECT-SETUP.md: "{n}" ({folder}/) is live but not in the project instructions')

    # 2. the short descriptions name every section
    home = plain(read('index.html'))
    desc = re.search(r'<meta name="description" content="([^"]*)"', home)
    shorts = {'index.html (meta description)': desc.group(1) if desc else '',
              'site.webmanifest (description)': json.loads(read('site.webmanifest')).get('description', ''),
              'docs/CLAUDE-PROJECT-SETUP.md (project description)': setup[setup.index('## Project name'):setup.index('## Project instructions')]}
    want = [n for n, f, s in tools if s == 'Project'] + (['Orbit & Space Watch'] if any(s == 'Orbit & Space Watch' for n, f, s in tools) else [])
    for where, text in shorts.items():
        for w in want:
            if w.lower() not in text.lower():
                problems.append(f'{where}: does not name "{w}"')

    # 3. links from the home page and the Space Watch page
    sw = read('space-watch/index.html')
    for n, folder, sec in tools:
        if not re.search(r'href="(\./)?' + re.escape(folder) + r'/', home):
            problems.append(f'index.html: no link to {folder}/ ("{n}")')
        if sec == 'Orbit & Space Watch' and f'href="../{folder}/' not in sw:
            problems.append(f'space-watch/index.html: no link to ../{folder}/ ("{n}")')

    # 4. every page in SECTIONS exists and has a Back-button name
    js = read('shared/footer.js')
    nm = js[js.index('const NAMES = ['):]
    pats = [re.compile(p.replace('\\/', '/')) for p in re.findall(r"\[/((?:[^/\\]|\\.)+)/, '", nm[:nm.index('\n];')])]
    for sec, items in sections():
        for label, url, soon in items:
            if soon or url.startswith('http'):
                continue
            path = url.split('#')[0]
            file = path + 'index.html' if path.endswith('/') or path == '' else path
            if not os.path.exists(os.path.join(ROOT, file)):
                problems.append(f'shared/footer.js SECTIONS: "{label}" points to {url}, which does not exist')
            full = '/site/' + path
            if not any(p.search(full) for p in pats):
                problems.append(f'shared/footer.js NAMES: no Back-button name for {path} ("{label}")')

    # 5. every project folder has a README in the record
    parts = read('docs/record/build_record.js')
    for n, folder, sec in tools:
        if not os.path.exists(os.path.join(ROOT, folder, 'README.md')):
            problems.append(f'{folder}/README.md is missing ("{n}")')
        elif f"'{folder}/README.md'" not in parts:
            problems.append(f'docs/record/build_record.js: {folder}/README.md is not in PARTS')

    # 6. no folder of pages left out of SECTIONS
    files = subprocess.run(['git', 'ls-files', '*.html'], cwd=ROOT, capture_output=True, text=True).stdout.splitlines()
    folders = {f.split('/')[0] for f in files if '/' in f and 'mockup' not in f and '/vendor/' not in f}
    known = {f for n, f, s in tools} | SITE_PAGES
    for f in sorted(folders - known):
        problems.append(f'{f}/: a folder of pages that is neither in SECTIONS (shared/footer.js) nor a site page '
                        f'(SITE_PAGES in dev/check_docs.py)')

    # 7. no "three projects" in the general documents
    for f in GENERAL:
        for m in re.finditer(r'\b(three (learning|projects|ways)|all three projects|the three projects)', plain(read(f)), re.I):
            problems.append(f'{f}: "{m.group(0)}": the site has {len(names)} projects and tools')

    # 8. the roadmap's shape
    road = read('docs/ROADMAP.md').split('\n')
    nums = [int(m.group(1)) for l in road for m in [re.match(r'## (\d+)\. ', l)] if m]
    if nums != list(range(len(nums))):
        problems.append(f'docs/ROADMAP.md: section numbers {nums} are not 0, 1, 2, … in order (a heading was lost?)')
    in_code = False
    for n, l in enumerate(road, 1):
        if l.startswith('```'):
            in_code = not in_code
        if in_code:
            continue
        if l.startswith('- [x]'):
            problems.append(f'docs/ROADMAP.md:{n}: a finished item (move it to CHANGELOG.md and remove it here)')
        if l.startswith('  ') and not l.lstrip().startswith(('- ', '* ')) and n > 1 and road[n - 2].strip() == '':
            problems.append(f'docs/ROADMAP.md:{n}: an indented line on its own (left behind when the item above it was removed?)')

    # 9. every page has its preview card for shared links (dev/build_social.py, Nov 19, 2026)
    card = subprocess.run([sys.executable, os.path.join(ROOT, 'dev', 'build_social.py'), '--check'], cwd=ROOT, capture_output=True, text=True)
    if card.returncode:
        problems.append(card.stdout.strip() or card.stderr.strip()[-600:])

    # 10. the credit on every document and file of code, and the patch on every document (dev/brand_files.py,
    # Nov 19, 2026)
    brand = subprocess.run([sys.executable, os.path.join(ROOT, 'dev', 'brand_files.py'), '--check'], cwd=ROOT, capture_output=True, text=True)
    if brand.returncode:
        problems.append(brand.stdout.strip() or brand.stderr.strip()[-600:])

    # 11. links between documents
    for f in subprocess.run(['git', 'ls-files', '-z', '*.md'], cwd=ROOT, capture_output=True, text=True).stdout.split('\0'):
        if not f or 'handoffs/' in f:
            continue
        text = re.sub(r'```.*?```', '', read(f), flags=re.S)
        for m in re.finditer(r'\]\(([^)\s]+)\)', text):
            u = m.group(1).strip('<>')
            if re.match(r'(https?:|mailto:|#)', u):
                continue
            if not os.path.exists(os.path.normpath(os.path.join(ROOT, os.path.dirname(f), unquote(u.split('#')[0])))):
                problems.append(f'{f}: the link to {u} points to a file that does not exist')

    if problems:
        print('Documents check: problems found\n')
        print('\n'.join(problems))
        sys.exit(1)
    print(f'Documents check: no problems ({len(names)} live projects and tools: {", ".join(names)}).')


if __name__ == '__main__':
    main()
