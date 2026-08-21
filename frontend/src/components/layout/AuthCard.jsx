import Card from "../ui/Card";

function AuthCard({ children }) {
  return <Card className="border-slate-800/70 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/40 sm:p-8">{children}</Card>;
}

export default AuthCard;
