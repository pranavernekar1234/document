import './globals.css';
import NavBar from '../components/NavBar';

export const metadata = {
  title: { default: 'DocuForge — Free PDF Tools', template: '%s · DocuForge' },
  description: 'Convert, edit, compress, merge, split, sign and secure PDFs with 30+ free tools. No account. No watermarks. No limits.',
  keywords: ['free pdf tools','pdf converter','compress pdf','merge pdf','split pdf','word to pdf','pdf editor'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-slate-900 text-white antialiased">
        <NavBar />
        <main style={{ paddingTop: 'var(--nav-height)' }}>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteFooter() {
  const cols = [
    {
      heading: 'Organize', links: [
        { label: 'Merge PDF',     href: '/tools/merge-pdf' },
        { label: 'Split PDF',     href: '/tools/split-pdf' },
        { label: 'Remove Pages',  href: '/tools/remove-pages' },
        { label: 'Extract Pages', href: '/tools/extract-pages' },
        { label: 'Organize PDF',  href: '/tools/organize-pdf' },
      ]
    },
    {
      heading: 'Convert', links: [
        { label: 'Word to PDF',   href: '/word-to-pdf' },
        { label: 'PDF to Word',   href: '/pdf-to-word' },
        { label: 'JPG to PDF',    href: '/tools/images-to-pdf' },
        { label: 'PDF to JPG',    href: '/tools/pdf-to-jpg' },
        { label: 'PPTX to PDF',   href: '/tools/pptx-to-pdf' },
        { label: 'Excel to PDF',  href: '/tools/xlsx-to-pdf' },
      ]
    },
    {
      heading: 'Edit & Security', links: [
        { label: 'Compress PDF',     href: '/tools/compress-pdf' },
        { label: 'Rotate PDF',       href: '/tools/rotate-pdf' },
        { label: 'Add Watermark',    href: '/tools/watermark-pdf' },
        { label: 'Protect PDF',      href: '/tools/protect-pdf' },
        { label: 'Sign PDF',         href: '/tools/sign-pdf' },
        { label: 'AI Summarizer',    href: '/tools/ai-summarizer' },
      ]
    },
    {
      heading: 'Company', links: [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Use',   href: '#' },
        { label: 'Security',       href: '#' },
        { label: 'API (coming)',    href: '#' },
      ]
    },
  ];

  return (
    <footer className="border-t border-white/5 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow-sm">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 2h7l3 3v9H3V2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 2v3h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6 8h4M6 11h3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-bold text-[15px] text-white tracking-tight">DocuForge</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              30+ free PDF tools for modern teams. No sign-up ever.
            </p>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full w-fit border border-emerald-500/20 bg-emerald-500/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">All systems operational</span>
            </div>
          </div>
          {/* Link columns */}
          {cols.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-white text-sm font-semibold mb-4">{heading}</p>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-slate-500 hover:text-white text-sm transition-colors duration-150">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} DocuForge. Files are processed in-memory and never stored. Always free.
          </p>
          <div className="flex items-center gap-1.5">
            {['#2563EB','#7C3AED','#06B6D4'].map((c,i) => (
              <div key={i} className="w-2 h-2 rounded-full opacity-60" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
