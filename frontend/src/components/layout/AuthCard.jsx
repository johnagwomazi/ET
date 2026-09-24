import Card from "../ui/Card";

function AuthCard({ children }) {
  return <Card className="w-full rounded-[1.75rem] border-slate-800/80 bg-slate-900/90 p-5 shadow-2xl shadow-slate-950/50 backdrop-blur sm:p-8">{children}</Card>;
}

export default AuthCard;
