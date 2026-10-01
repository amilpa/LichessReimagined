import { vi } from 'vitest';

// Test support: GitHub as fetch sees it, serving a folder of files for one
// repository on its raw host and, with a token, through its API.

export interface FakeGithub {
  /** The URLs asked for, in order, and the token each carried. */
  readonly requests: { readonly url: string; readonly token: string | null }[];
}

export type Files = ReadonlyMap<string, Uint8Array>;

interface FakeOptions {
  /** `owner/repo` */
  readonly repo: string;
  readonly files: Files;
  /** The token a private repository needs; none for a public one. */
  readonly token?: string;
}

/** The file a URL asks for in `repo` (on a one-word branch), or null. */
function fileOf(url: URL, repo: string): string | null {
  if (url.hostname === 'raw.githubusercontent.com') {
    const [, owner, name, , ...file] = url.pathname.split('/');
    return `${owner}/${name}` === repo ? decodeURIComponent(file.join('/')) : null;
  }
  const match = /^\/repos\/([^/]+\/[^/]+)\/contents\/(.*)$/.exec(url.pathname);
  return url.hostname === 'api.github.com' && match?.[1] === repo
    ? decodeURIComponent(match[2] ?? '')
    : null;
}

export function fakeGithub({ repo, files, token: needed }: FakeOptions): FakeGithub {
  const requests: FakeGithub['requests'][number][] = [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const token = new Headers(init?.headers).get('authorization')?.replace(/^Bearer /, '') ?? null;
    requests.push({ url: input, token });
    const api = url.hostname === 'api.github.com';
    if (api && needed !== undefined && token !== needed) return new Response(null, { status: 401 });
    // A private repository's files aren't on the raw host.
    const file = !api && needed !== undefined ? null : fileOf(url, repo);
    const bytes = file === null ? undefined : files.get(file);
    if (bytes === undefined) return new Response('404: Not Found', { status: 404 });
    // A copy, as a Response wants bytes of an ArrayBuffer of their own.
    const body = new Uint8Array(bytes.length);
    body.set(bytes);
    return new Response(body);
  });
  return { requests };
}
