export type FakeRevision = {
  readonly revid: number;
  readonly timestamp: string;
  readonly wikitext: string;
};

/** Revisions per page title, in any order. */
export type FakeWiki = Readonly<Record<string, readonly FakeRevision[]>>;

/**
 * Answers MediaWiki action=query&prop=revisions requests like the real API:
 * the latest revision, or the latest one at or before rvstart. A title not in
 * `wiki` is missing; a title whose revisions all come later has none.
 */
export function fakeMediaWikiFetch(wiki: FakeWiki): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const title = url.searchParams.get("titles") ?? "";
    const start = url.searchParams.get("rvstart");
    const revisions = wiki[title];

    let page: object;
    if (!revisions) {
      page = { title, missing: true };
    } else {
      const latest = [...revisions]
        .filter((revision) => start === null || revision.timestamp <= start)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      page = latest
        ? {
            title,
            revisions: [
              {
                revid: latest.revid,
                timestamp: latest.timestamp,
                slots: { main: { content: latest.wikitext } },
              },
            ],
          }
        : { title };
    }
    return new Response(JSON.stringify({ query: { pages: [page] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}
