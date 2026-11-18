#!/usr/bin/env python3
# NASA and ESA Data Projects · the style check · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Keeps every page on the shared component set (docs/DESIGN.md, decided Nov 13, 2026). Run by GitHub after every push
# (.github/workflows/checks.yml) and by hand:
#   python3 dev/check_styles.py        (exit 1 lists every problem)
#
# It checks that:
#   1. no page has a <style> block or a style="…" attribute (a page's look comes from shared/theme.css and, for the
#      inside of a tool, its project's style sheet; values worked out from data are set by the page's script);
#   2. every page links shared/theme.css and shared/footer.js, and every versioned style file with the same version tag;
#      every page outside Sky Finder carries the site's app icon, browser-tab icon, manifest and short name (NEDAP);
#   3. no project style sheet redefines a shared component on its own (a rule such as ".btn { … }" or ".card { … }");
#      a project may only adjust a component inside its own parts (".mapbar .seg { … }", ".chip.play { … }");
#   4. (since Nov 18, 2026) every ?v= version tag in a page or a script is the same, and Sky Finder's sw.js VERSION
#      matches it, so no file is left behind when the tag is raised;
#   5. (since Nov 18, 2026) every page of a project with more than one page carries the project's tab bar
#      (<nav class="tabs" aria-label="<project>">, docs/DESIGN.md "Project tab bar") linking to all of its pages,
#      and a new folder with more than one page is added to TAB_PROJECTS below.
import os, posixpath, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = ('docs/', 'dev/', 'image-explorer/vendor/', 'shared/vendor/', 'node_modules/')
SKIP_FILES = {'mars-data/mockup.html', 'spacecraft/mockup-more.html'}           # a mock-up waiting for approval, not a page of the site
PROJECT_CSS = ['asteroid-tracker/tracker.css', 'image-explorer/explorer.css', 'mars-data/mars.css',
               'spacecraft/spacecraft.css', 'sky-finder/sky-finder.css', 'planet-maps/maps.css', 'space-weather/spaceweather.css',
               'orbit-watch/orbit.css',
               'exoplanets/exoplanets.css']
# the shared components (shared/theme.css); a project style sheet may not restyle one of these by itself
SHARED = ['readbar', 'totop', 'glide', 'glides', 'reveal', 'btn', 'chip', 'chips', 'card', 'cards', 'panel', 'panels', 'seg', 'tabs', 'notice', 'badge', 'badges', 'pill',
          'tag', 'stat', 'stats', 'tile', 'tiles', 'pagehead', 'phead', 'back', 'backlink', 'howto', 'section',
          'section-head', 'shead', 'footer', 'fmap', 'fcol', 'fcols', 'fhead', 'flegal', 'flinks', 'fbrand', 'srcline', 'lede', 'kicker', 'eyebrow', 'bigsearch', 'qclear',
          'filters', 'periodbar', 'period', 'linkbtn', 'state', 'empty', 'loading', 'ctl', 'table', 'prose', 'list',
          'terms', 'sources', 'steps', 'split', 'legend', 'tip', 'note', 'caption', 'aside', 'lbl', 'wrap', 'topbar',
          'nav', 'brand', 'more', 'viewhead', 'actions', 'field', 'sr', 'hscroll', 'callout', 'stage', 'medal',
          'need', 'chart', 'chartcard', 'display-link', 'summary', 'updated', 'facts', 'light', 'livestatus',
          'levels', 'board', 'board-head', 'jobs', 'job', 'job-when', 'job-side', 'job-state', 'srcstate', 'ticks',
          'reload', 'reloader', 'rnote', 'phtitle']

# 5. the project tab bars: folder -> the bar's label; pages that are not one of the project's views (an asteroid's own
# page) carry the bar but need no link to themselves
TAB_PROJECTS = {'asteroid-tracker': 'Asteroid Tracker', 'image-explorer': 'Image Explorer', 'mars-data': 'Mars Data',
                'orbit-watch': 'Orbit Watch', 'exoplanets': 'Exoplanets'}
TAB_NOT_LINKED = {'asteroid-tracker/object.html'}
TAB_EXEMPT = {'sky-finder': 'an installable app with its own screens; how-to.html has a Back button',
              'design': 'the component page', 'shared': 'shared code'}

def page_key(path):
    # 'mars-data/charts/index.html' -> 'mars-data/charts/'; 'orbit-watch/tracker.html' stays
    return path[:-len('index.html')] if path.endswith('index.html') else path

def tabs_problems(pages, read):
    out = []
    by_folder = {}
    for f in pages:
        if '/' in f:
            by_folder.setdefault(f.split('/')[0], []).append(f)
    for folder, fs in sorted(by_folder.items()):
        if folder in TAB_EXEMPT or len(fs) < 2:
            continue
        label = TAB_PROJECTS.get(folder)
        if not label:
            out.append(f'{folder}/: {len(fs)} pages but no project tab bar rule (add it to TAB_PROJECTS in dev/check_styles.py)')
            continue
        want = {page_key(f) for f in fs if f not in TAB_NOT_LINKED}
        for f in fs:
            s = read(f)
            m = re.search(r'<nav class="tabs" aria-label="' + re.escape(label) + r'">(.*?)</nav>', s, re.S)
            if not m:
                out.append(f'{f}: missing the project tab bar <nav class="tabs" aria-label="{label}">')
                continue
            base = posixpath.dirname(f)
            have = set()
            for h in re.findall(r'<a\s[^>]*href="([^"#]*)', m.group(1)):
                if not h:
                    continue
                full = posixpath.normpath(posixpath.join(base, h)) + ('/' if h.endswith('/') or h in ('.', '..') else '')
                have.add(page_key(full))
            missing = sorted(w for w in want if w != page_key(f) and w not in have)
            if missing:
                out.append(f'{f}: the tab bar has no link to {", ".join(missing)}')
    return out

def tracked():
    out = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=ROOT,
                         capture_output=True, text=True, check=True).stdout.split('\n')
    return [f for f in out if f and not f.startswith(SKIP) and f not in SKIP_FILES]

def main():
    problems = []
    files = tracked()
    pages = [f for f in files if f.endswith('.html')]
    tags = {}
    for f in pages:
        s = open(os.path.join(ROOT, f), encoding='utf-8').read()
        in_script = False
        for n, line in enumerate(s.split('\n'), 1):
            # a page's own script may set values worked out from data (a chart key's colour); markup may not
            opened, closed = len(re.findall(r'<script\b', line)), len(re.findall(r'</script>', line))
            check = not in_script and not (opened and not closed)
            in_script = (in_script or opened > closed) and not (closed >= opened and closed > 0)
            if not check:
                continue
            if re.search(r'<style[\s>]', line):
                problems.append(f'{f}:{n}: a <style> block (use shared/theme.css or the project style sheet)')
            if re.search(r'\sstyle="', line):
                problems.append(f'{f}:{n}: a style="…" attribute: {line.strip()[:100]}')
        if not re.search(r'shared/theme\.css\?v=\d+', s):
            problems.append(f'{f}: does not link shared/theme.css with a version tag')
        if not re.search(r'shared/footer\.js\?v=\d+', s):
            problems.append(f'{f}: does not load shared/footer.js with a version tag')
        if not f.startswith('sky-finder/') and not ('apple-touch-icon.png' in s and 'site.webmanifest' in s
                                                    and 'name="apple-mobile-web-app-title" content="NEDAP"' in s):
            problems.append(f'{f}: missing the site\'s app icon and short name (apple-touch-icon, site.webmanifest, NEDAP)')
        if not f.startswith('sky-finder/') and 'shared/icons/favicon.svg' not in s:
            problems.append(f'{f}: missing the NEDAP browser-tab icon (shared/icons/favicon.svg; see docs/DESIGN.md, "Logo and icons")')
        for m in re.finditer(r'([\w.-]+\.(?:css|js))\?v=(\d+)', s):
            tags.setdefault(m.group(2), []).append(f'{f} ({m.group(1)})')
    for f in files:
        if f.endswith('.js') and not f.startswith(('shared/vendor/', 'image-explorer/vendor/')):
            s = open(os.path.join(ROOT, f), encoding='utf-8').read()
            for m in re.finditer(r'([\w.-]+\.(?:css|js))\?v=(\d+)', s):
                tags.setdefault(m.group(2), []).append(f'{f} ({m.group(1)})')
            m = re.search(r"VERSION = 'sky-finder-(\d+)'", s) if f == 'sky-finder/sw.js' else None
            if m:
                tags.setdefault(m.group(1), []).append(f'{f} (VERSION)')
    if len(tags) > 1:
        newest = max(tags)
        for v, where in sorted(tags.items()):
            if v != newest:
                for w in where:
                    problems.append(f'{w}: version tag {v}, not the current {newest} (raise it in every page)')
    problems += tabs_problems(pages, lambda f: open(os.path.join(ROOT, f), encoding='utf-8').read())
    for f in PROJECT_CSS:
        p = os.path.join(ROOT, f)
        if not os.path.exists(p):
            continue
        css = re.sub(r'/\*.*?\*/', '', open(p, encoding='utf-8').read(), flags=re.S)
        for m in re.finditer(r'(^|[}\n])\s*([^{}@]+?)\s*\{', css):
            for sel in m.group(2).split(','):
                sel = sel.strip()
                k = re.fullmatch(r'\.([a-z][\w-]*)(:hover|:focus|:active|:focus-visible)?', sel)
                if k and k.group(1) in SHARED:
                    line = css[:m.start(2)].count('\n') + 1
                    problems.append(f'{f}:{line}: restyles the shared component .{k.group(1)} on its own '
                                    f'(adjust it inside the tool\'s own parts, or change shared/theme.css)')
    if problems:
        print('Style check: problems found\n')
        print('\n'.join(problems))
        print('\nThe rules are in docs/DESIGN.md ("Components" and "Page styles").')
        sys.exit(1)
    print('Style check: no problems.')

if __name__ == '__main__':
    main()
