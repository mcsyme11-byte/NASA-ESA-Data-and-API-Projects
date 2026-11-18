#!/usr/bin/env python3
# NASA and ESA Data Projects · the documents check · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Keeps the project-wide documents in step with the site (added Nov 18, 2026, after the Project Record still listed
# three projects and the roadmap had lost its Mars Data heading). Run by GitHub after every push
# (.github/workflows/checks.yml) and by hand:
#   python3 dev/check_docs.py        (exit 1 lists every problem)
#
# It checks that:
#   1. every project and tool live on the site (the sections of SECTIONS in shared/footer.js, the Space Watch tools and
#      the utilities) is named in README.md's project tables and in the Project Record's "The projects at a glance"
#      (docs/record/front.md), and that neither still calls a live one "planned";
#   2. docs/ROADMAP.md keeps its shape: numbered sections in order with no number missing, no finished "[x]" items
#      (they move to CHANGELOG.md), and no indented line left behind on its own when an item above it was removed;
#   3. the Project Record's cover lists the same projects: it reads them from shared/footer.js (build_record.js).
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda f: open(os.path.join(ROOT, f), encoding='utf-8').read()


def sections():
    """SECTIONS from shared/footer.js as [(section, [(label, url, soon), ...]), ...]."""
    js = read('shared/footer.js')
    body = js[js.index('const SECTIONS = ['):]
    body = body[body.index('['):body.index('\n];') + 2]
    body = re.sub(r'//[^\n]*', '', body).replace("'", '"')
    body = re.sub(r'\{\s*soon:\s*true\s*\}', '{"soon": true}', body)
    body = re.sub(r',\s*([\]}])', r'\1', body)
    return [(name, [(i[0], i[1], bool(len(i) > 2 and i[2].get('soon'))) for i in items]) for name, items in json.loads(body)]


def live_names():
    names = []
    for name, items in sections():
        if name == 'Space Watch':
            names += [label for label, url, soon in items if label != 'Overview' and not soon]
        elif name == 'More':
            names += [label for label, url, soon in items if url in ('sky-finder/', 'spacecraft/') and not soon]
        else:
            names.append(name)
    return names


def main():
    problems = []
    names = live_names()

    readme = read('README.md')
    front = read('docs/record/front.md')
    glance = front[front.index('# The projects at a glance'):]
    glance = glance[:glance.index('\n# ', 2)] if '\n# ' in glance[2:] else glance
    for n in names:
        if not re.search(r'\*\*\[?' + re.escape(n) + r'\]?\**', readme, re.I):
            problems.append(f'README.md: "{n}" is live on the site but not in the project tables')
        row = next((l for l in glance.split('\n') if l.startswith('|') and n.lower() in l.lower()), None)
        if not row:
            problems.append(f'docs/record/front.md: "{n}" is live on the site but has no row in "The projects at a glance"')
        elif re.search(r'\|\s*Planned', row):
            problems.append(f'docs/record/front.md: "{n}" is live on the site but its row still says "Planned"')
    for f, s in (('README.md', readme), ('docs/record/front.md', front)):
        for m in re.finditer(r'\b(three (learning|projects|ways)|all three\b|the three projects)', s, re.I):
            problems.append(f'{f}: "{m.group(0)}": the site has {len(names)} projects and tools now')

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

    if problems:
        print('Documents check: problems found\n')
        print('\n'.join(problems))
        sys.exit(1)
    print(f'Documents check: no problems ({len(names)} live projects and tools: {", ".join(names)}).')


if __name__ == '__main__':
    main()
