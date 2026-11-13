// A build is known by its entry script: Vite names it after its contents
// (`/assets/index-<hash>.js`), so a new deploy always brings a new name.
const ENTRY = /<script[^>]*type="module"[^>]*src="([^"]*\/assets\/index-[^"]+\.js)"/;

export const entryScript = (html: string): string | undefined => ENTRY.exec(html)?.[1];

/** The entry script this tab is running. */
export const runningEntry = (doc: Document = document): string | undefined => {
  const script = doc.querySelector<HTMLScriptElement>(
    'script[type="module"][src*="/assets/index-"]'
  );
  return script ? new URL(script.src, doc.baseURI).pathname : undefined;
};

/** The entry script the server hands out now, read past every cache. */
export const publishedEntry = async (): Promise<string | undefined> => {
  const response = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return undefined;
  const src = entryScript(await response.text());
  return src ? new URL(src, window.location.origin).pathname : undefined;
};
