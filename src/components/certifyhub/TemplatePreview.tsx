type Props = {
  html: string;
  title?: string;
  className?: string;
};

/**
 * Renders template markup inside a sandboxed iframe so certificate designs
 * can never run scripts or touch the app.
 */
export function TemplatePreview({ html, title = "Certificate preview", className }: Props) {
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box;}body{margin:0;padding:0;background:transparent;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}</style></head><body>${html}</body></html>`;

  return (
    <iframe
      title={title}
      sandbox=""
      srcDoc={document}
      className={className ?? "h-[420px] w-full rounded-2xl border border-border bg-white"}
    />
  );
}
