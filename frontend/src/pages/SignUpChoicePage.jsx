import { motion } from "framer-motion";
import { ArrowRight, BriefcaseBusiness, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import Button from "../components/ui/Button";
import { ROUTE_PATHS } from "../routes/routePaths";
import { getPendingGoogleRegistration } from "../utils/pendingAuth";

const options = [
  {
    title: "Join as Customer",
    description: "Buy tickets and manage your bookings.",
    to: ROUTE_PATHS.REGISTER_CUSTOMER,
    accountType: "CUSTOMER",
    icon: UserRound,
  },
  {
    title: "Register as Organizer",
    description: "Create events and manage your organization.",
    to: ROUTE_PATHS.REGISTER_ORGANIZER,
    accountType: "ADMIN",
    icon: BriefcaseBusiness,
  },
];

function SignUpChoicePage() {
  const pendingGoogle = getPendingGoogleRegistration();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full"
    >
      <AuthCard>
        <div className="space-y-6">
          <AuthHeader
            eyebrow="Create account"
            title="Choose how you want to use the platform"
            description="Pick the path that matches your role. You can always sign in later from the login page."
          />

          <div className="space-y-4">
            {options.map((option) => {
              const Icon = option.icon;

              return (
                <Button
                  key={option.title}
                  as={Link}
                  to={pendingGoogle?.completionToken
                    ? `${ROUTE_PATHS.GOOGLE_COMPLETE}?accountType=${option.accountType}`
                    : option.to}
                  variant="secondary"
                  className="h-auto w-full justify-between px-5 py-4 text-left"
                >
                  <span className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-app-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-base font-semibold text-white">{option.title}</span>
                      <span className="block text-sm font-normal text-slate-400">
                        {option.description}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Button>
              );
            })}
          </div>
          <p className="text-center text-sm text-slate-400">
            Already have an account? <Link to={ROUTE_PATHS.LOGIN} className="font-medium text-app-300 hover:text-app-200">Sign in</Link>
          </p>
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default SignUpChoicePage;
