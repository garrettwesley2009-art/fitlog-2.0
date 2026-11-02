// Remounts on every tab change, so each page plays the short slide-in from globals.css.
export default function MainTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>
}
