/**
 * Parses a string and converts any Jira issue key pattern (e.g. LP-1234, TUM-99)
 * into an external Jira link. Works dynamically for any project key.
 */
export function renderTitleWithLinks(title: string, jiraSiteUrl?: string) {
  if (!title) return null;

  const parts = title.split(/([A-Z][A-Z0-9]+-\d+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (/^[A-Z][A-Z0-9]+-\d+$/.test(part)) {
          const base = jiraSiteUrl
            ? jiraSiteUrl.replace(/\/$/, "")
            : "https://jira.atlassian.net";
          return (
            <a
              key={i}
              href={`${base}/browse/${part}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/30 font-bold transition-colors cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
