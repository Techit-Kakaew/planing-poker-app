/**
 * Parses a string and converts any LP-xxxx pattern into an external Jira link.
 */
export function renderTitleWithLinks(title: string) {
  if (!title) return null;

  // Split by the pattern and capture the pattern to keep it in the array
  const parts = title.split(/(LP-\d+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(/^LP-\d+$/)) {
          return (
            <a
              key={i}
              href={`https://7-solutions.atlassian.net/browse/${part}`}
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
