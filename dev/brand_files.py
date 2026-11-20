#!/usr/bin/env python3
# NASA and ESA Data Projects · the credit and patch on every file · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Decided Nov 19, 2026: every document and every file of code in the repository carries the project's credit,
# "© 2026 Malcolm Syme · mcsyme11@gmail.com", and every Markdown document opens with the NEDAP mission patch, so the
# project's name, owner and mark show wherever the repository is read (on GitHub, in a copy, in the Project Record).
#
#   python3 dev/brand_files.py           adds what is missing (run it after adding a file)
#   python3 dev/brand_files.py --check   lists files without it and fails (dev/check_docs.py runs it, so the check
#                                        before every push and GitHub's Checks refuse such a file)
#
# What each kind of file gets, when it does not already have the credit (©, the name and the email together):
#   Markdown (.md)        a centred header: the patch (brand/patch/nedap-patch.svg, 72 px) and the credit line under it;
#                         the Project Record leaves the header out, as every page of the record carries the credit
#   Python, shell, YAML   a first comment line (after a #! line):  # NASA and ESA Data Projects · <file> · © …
#   JavaScript            // NASA and ESA Data Projects · <file> · © …
#   CSS                   /* NASA and ESA Data Projects · <file> · © … */
#   HTML, SVG             <!-- NASA and ESA Data Projects · <file> · © … --> (after <!DOCTYPE> or <?xml?>)
# A file whose first comment names the project and the developer but not the email has the email added to that line.
# Left out: third-party files (shared/vendor/, the licences of libraries), data files written by the data jobs
# (folders named data/, which hold JSON, CSV and reports; the Mars Data reports carry the credit from their scripts),
# file types that cannot hold a comment (JSON, CSV, web manifests, pictures, the PDF), and LICENSE.md, whose
# copyright line is the licence's own.

import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDIT = '© 2026 Malcolm Syme · mcsyme11@gmail.com'
NAME = 'NASA and ESA Data Projects'
HAS = re.compile(r'©\s*20\d\d\s+Malcolm Syme')
PATCH = 'brand/patch/nedap-patch.svg'

HASH = ('.py', '.sh', '.yml', '.yaml', '.gitignore', '.example', 'pre-push')
SLASH = ('.js', '.mjs')


def files():
    out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True).stdout.split('\n')
    keep = []
    for f in out:
        if not f or f.startswith('shared/vendor/') or '/data/' in f or f == 'LICENSE.md' or 'LICENSE-' in f:
            continue
        if f.endswith(('.md', '.css', '.html', '.svg') + SLASH) or f.endswith(HASH):
            keep.append(f)
    return keep


def credited(text):
    return bool(HAS.search(text)) and 'mcsyme11@gmail.com' in text


def label(f):
    """the file's part of the site, for its comment line"""
    return f


def md_header(f):
    up = '../' * f.count('/')
    return (f'<p align="center"><img src="{up}{PATCH}" width="72" alt="The NEDAP mission patch"><br>'
            f'<sub>{NAME} · © 2026 Malcolm Syme · '
            '<a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>\n\n')


def fix(f, text):
    """the file's text with the credit added, or None when nothing is needed"""
    if f.endswith('.md'):
        if 'brand/patch/nedap-' in text.split('\n#', 1)[0] and credited(text):
            return None
        return md_header(f) + text.lstrip('\n')
    if credited(text):
        return None
    lines = text.split('\n')
    # a first comment naming the developer without the email: the email is added to it
    for i, line in enumerate(lines[:4]):
        if 'Malcolm Syme' in line and '©' in line and 'mcsyme11@gmail.com' not in line:
            lines[i] = re.sub(r'(Malcolm Syme)', r'\1 · mcsyme11@gmail.com', line, count=1)
            return '\n'.join(lines)
    what = f'{NAME} · {label(f)} · {CREDIT}'
    if f.endswith(HASH):
        line = '# ' + what
        at = 1 if lines and lines[0].startswith('#!') else 0
    elif f.endswith(SLASH):
        line = '// ' + what
        at = 0
    elif f.endswith('.css'):
        line = '/* ' + what + ' */'
        at = 1 if lines and lines[0].startswith('@charset') else 0
    else:   # HTML and SVG
        line = '<!-- ' + what + ' -->'
        at = 1 if lines and re.match(r'\s*<(!DOCTYPE|\?xml)', lines[0], re.I) else 0
    lines.insert(at, line)
    return '\n'.join(lines)


def main():
    check = '--check' in sys.argv
    todo = []
    for f in files():
        path = os.path.join(ROOT, f)
        try:
            text = open(path, encoding='utf-8').read()
        except (OSError, UnicodeDecodeError):
            continue
        new = fix(f, text)
        if new is None:
            continue
        todo.append(f)
        if not check:
            open(path, 'w', encoding='utf-8').write(new)
    if check:
        if todo:
            print('Files without the credit (and, for documents, the patch); run python3 dev/brand_files.py:\n  '
                  + '\n  '.join(todo))
            sys.exit(1)
        print('Credit: every document and file of code carries it.')
    else:
        print(f'Credit added to {len(todo)} files.' + ('\n  ' + '\n  '.join(todo) if todo else ''))


if __name__ == '__main__':
    main()
